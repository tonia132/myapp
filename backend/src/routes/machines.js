// backend/src/routes/machines.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { logAction } from "../utils/logAction.js";

import {
  startMachineBySchedule,
  stopMachineAndSchedule,
  getMachineCurrentExecution,
} from "../services/machineRunner.js";

import { sendChamberSetpoint } from "../utils/chamberControl.js";

import {
  Machine,
  MachineTest,
  AuditLog,
  User,
  MachineSchedule,
  File, // ✅ 預覽圖關聯用
} from "../models/index.js";

const router = express.Router();

// ✅ 視為「排程控制中」的狀態
const ACTIVE_SCHEDULE_STATUS = ["scheduled", "running"];

// ✅ 只有當 body 有帶 previewFileId 時才要求 admin
const adminOnlyIfPreviewChange = (req, res, next) => {
  const body = req.body || {};
  if (Object.prototype.hasOwnProperty.call(body, "previewFileId")) {
    return requireAdmin(req, res, next);
  }
  return next();
};

// 小工具：轉數字（"" / null / undefined -> null）
const toNum = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ✅ mock 環境允許範圍
const TEMP_MIN = -80;
const TEMP_MAX = 250;
const HUM_MIN = 0;
const HUM_MAX = 100;

// ✅ 規則：20°C 以下「沒有濕度」（不顯示 / 不控濕）
const HUM_DISABLE_BELOW_TEMP = 20;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* =========================================================
   🔧 monitor rate limit + TTL sweep
   - 同 IP & 同機台最短 300ms
   - 避免 Map 無限長大（10 分鐘無使用自動清）
========================================================= */
const monitorLastHit = new Map();
const MONITOR_MIN_INTERVAL_MS = 300;
const MONITOR_TTL_MS = 10 * 60 * 1000;

let monitorSweepCounter = 0;
function sweepMonitorMap(now = Date.now()) {
  monitorSweepCounter++;
  if (monitorSweepCounter % 500 !== 0) return;
  for (const [k, v] of monitorLastHit.entries()) {
    if (!v || now - (v.ts || 0) > MONITOR_TTL_MS) monitorLastHit.delete(k);
  }
}

function checkMonitorRateLimit(ip, machineId) {
  const now = Date.now();
  sweepMonitorMap(now);

  const key = `${ip}::${machineId}`;
  const prev = monitorLastHit.get(key)?.ts || 0;
  if (now - prev < MONITOR_MIN_INTERVAL_MS) {
    return { ok: false, retryAfterMs: MONITOR_MIN_INTERVAL_MS - (now - prev) };
  }
  monitorLastHit.set(key, { ts: now });
  return { ok: true, retryAfterMs: 0 };
}

/**
 * ✅ 假環境資料：讓同一台機台在記憶體裡共用同一組溫溼度
 * ✅ 改成「依時間」更新，而不是「每次呼叫就更新」
 */
const mockEnvCache = new Map();

// mockEnvCache TTL（避免 Map 越長越大）
const MOCK_ENV_TTL_MS = 60 * 60 * 1000; // 1hr
let envSweepCounter = 0;

function sweepMockEnv(now = Date.now()) {
  envSweepCounter++;
  if (envSweepCounter % 1000 !== 0) return;
  for (const [mid, env] of mockEnvCache.entries()) {
    if (!env || now - (env.lastTick || 0) > MOCK_ENV_TTL_MS) {
      mockEnvCache.delete(mid);
    }
  }
}

function getMockEnv(machineId, opts = {}) {
  const now = Date.now();
  sweepMockEnv(now);

  const { advance = true, targetTemp = null, targetHumidity = null } = opts;

  let env = mockEnvCache.get(machineId);

  if (!env) {
    env = {
      temperature: 25 + Math.random() * 5,
      humidity: 55 + Math.random() * 10,
      targetTemp: null,
      targetHumidity: null,
      lastTick: now,
      runtimeMinutes: 0, // ✅ 穩定 runtime（可選，但實用）
    };
    mockEnvCache.set(machineId, env);
  }

  // 兼容舊 env
  if (!("targetTemp" in env)) env.targetTemp = null;
  if (!("targetHumidity" in env)) env.targetHumidity = null;
  if (!("lastTick" in env)) env.lastTick = now;
  if (!("runtimeMinutes" in env)) env.runtimeMinutes = 0;

  // ✅ 同步 DB setpoint（避免 cache 跟 DB 不一致）
  if (typeof targetTemp === "number" && Number.isFinite(targetTemp)) {
    env.targetTemp = targetTemp;
  }
  if (typeof targetHumidity === "number" && Number.isFinite(targetHumidity)) {
    env.targetHumidity = targetHumidity;
  } else if (targetHumidity === null) {
    env.targetHumidity = null;
  }

  if (!advance) return env;

  // ✅ 用時間差更新：同一秒內呼叫多次不會一直跳
  let dt = (now - env.lastTick) / 1000; // seconds
  if (dt < 0.25) return env; // 小於 250ms 不更新（避免頻繁 poll 造成跳動）
  if (dt > 5) dt = 5; // 避免隔很久一次跳太大

  // runtime 累積（穩定）
  env.runtimeMinutes += Math.max(0, dt) / 60;

  // 讓「每秒靠近率」變成「dt 秒」的等效比例（較穩）
  const alphaT = 1 - Math.pow(1 - 0.15, dt);
  const alphaH = 1 - Math.pow(1 - 0.2, dt);

  // ✅ 溫度：有 targetTemp 就逐步靠近；沒有就小飄動
  if (typeof env.targetTemp === "number" && Number.isFinite(env.targetTemp)) {
    const diff = env.targetTemp - env.temperature;
    env.temperature =
      env.temperature +
      diff * alphaT +
      (Math.random() - 0.5) * 0.3 * Math.sqrt(dt);
  } else {
    env.temperature = env.temperature + (Math.random() - 0.5) * 0.2 * Math.sqrt(dt);
  }

  // ✅ 濕度：有 targetHumidity 就逐步靠近；沒有就小飄動
  if (typeof env.targetHumidity === "number" && Number.isFinite(env.targetHumidity)) {
    const diffH = env.targetHumidity - env.humidity;
    env.humidity =
      env.humidity +
      diffH * alphaH +
      (Math.random() - 0.5) * 0.6 * Math.sqrt(dt);
  } else {
    env.humidity = env.humidity + (Math.random() - 0.5) * 0.5 * Math.sqrt(dt);
  }

  env.temperature = clamp(env.temperature, TEMP_MIN, TEMP_MAX);
  env.humidity = clamp(env.humidity, HUM_MIN, HUM_MAX);

  env.lastTick = now;
  return env;
}

/**
 * 小工具：找出會鎖定此機台的排程（現在或未來，只要還沒結束）
 */
async function findLockingSchedule(machineId) {
  const now = new Date();
  return MachineSchedule.findOne({
    where: {
      machineId,
      status: { [Op.in]: ACTIVE_SCHEDULE_STATUS },
      endTime: { [Op.gte]: now },
    },
    order: [["startTime", "ASC"]],
  });
}

/**
 * 小工具：組合機台「總覽用」資訊
 * - currentSchedule / nextSchedule
 * - 即時 progress（來自 machineRunner）
 * - 當前溫度 / 溼度（mock：同一台機台共用同一組；依時間更新；同步 DB setpoint）
 * - ✅ 20°C 以下濕度回 null（不顯示）
 */
async function buildMachineOverview(machine, now) {
  const base = machine.toJSON(); // ✅ 若 findAll/include 有 previewFile，這裡會自然帶出

  const [currentScheduleRaw, nextScheduleRaw, exec] = await Promise.all([
    MachineSchedule.findOne({
      where: {
        machineId: machine.id,
        status: { [Op.in]: ACTIVE_SCHEDULE_STATUS },
        startTime: { [Op.lte]: now },
        endTime: { [Op.gte]: now },
      },
      order: [["startTime", "DESC"]],
    }),
    MachineSchedule.findOne({
      where: {
        machineId: machine.id,
        status: { [Op.in]: ACTIVE_SCHEDULE_STATUS },
        startTime: { [Op.gt]: now },
      },
      order: [["startTime", "ASC"]],
    }),
    getMachineCurrentExecution(machine.id).catch(() => null),
  ]);

  const currentSchedule = currentScheduleRaw ? currentScheduleRaw.toJSON() : null;
  const nextSchedule = nextScheduleRaw ? nextScheduleRaw.toJSON() : null;

  // 即時 progress：如果 machineRunner 有資料，覆蓋目前排程的進度
  if (currentSchedule && exec && exec.progress != null) {
    currentSchedule.realtimeProgress = exec.progress;
    if (currentSchedule.progress == null) {
      currentSchedule.progress = exec.progress;
    }
  }

  // ✅ 讀 DB setpoint 丟進 mock env（確保 target 同步）
  const dbT = toNum(base.targetTemp);
  let dbH = toNum(base.targetHumidity);

  // ✅ 若目標溫度 < 20°C → 不控濕（目標濕度視為 null）
  if (dbT != null && dbT < HUM_DISABLE_BELOW_TEMP) {
    dbH = null;
  }

  const env = getMockEnv(machine.id, { targetTemp: dbT, targetHumidity: dbH });

  // ✅ 若目前溫度 < 20°C → 濕度不顯示
  const humAvailable = env.temperature >= HUM_DISABLE_BELOW_TEMP;
  const humOut = humAvailable ? env.humidity : null;

  const realtimeProgress =
    exec?.progress ??
    currentSchedule?.realtimeProgress ??
    currentSchedule?.progress ??
    null;

  return {
    ...base,

    currentSchedule,
    nextSchedule,

    // ✅ 統一欄位名：同時提供兩套（不破壞既有前端）
    currentTemp: env.temperature,
    currentHumidity: humOut,
    temperature: env.temperature,
    humidity: humOut,

    // ✅ 穩定 runtime（如果你前端有顯示會更好看）
    runtimeMinutes: Math.floor(env.runtimeMinutes),

    realtimeProgress,
  };
}

/* ============================================================
   📡 即時監控資訊（MachineDetail 用）
   GET /api/machines/machine-monitor/:id
============================================================ */
router.get("/machine-monitor/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "無效的機台 ID" });

    const ip =
      req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() ||
      req.ip ||
      "local";

    const rl = checkMonitorRateLimit(ip, id);
    if (!rl.ok) {
      res.setHeader("Retry-After", String(Math.ceil(rl.retryAfterMs / 1000)));
      return res
        .status(429)
        .json({ message: "Too Many Requests", retryAfterMs: rl.retryAfterMs });
    }

    const exec = await getMachineCurrentExecution(id).catch(() => null);

    // ✅ 先讀 DB setpoint（若有）
    const m = await Machine.findByPk(id, {
      attributes: ["id", "targetTemp", "targetHumidity", "lastSetpointAt"],
    }).catch(() => null);

    const dbT = toNum(m?.targetTemp);
    let dbH = toNum(m?.targetHumidity);

    // ✅ setpoint 溫度 < 20°C → 不控濕
    if (dbT != null && dbT < HUM_DISABLE_BELOW_TEMP) {
      dbH = null;
    }

    // ✅ 再拿 mock env（依時間更新，並同步 DB setpoint）
    const env = getMockEnv(id, { targetTemp: dbT, targetHumidity: dbH });

    // ✅ 目前溫度 < 20°C → 不顯示濕度
    const humAvailable = env.temperature >= HUM_DISABLE_BELOW_TEMP;
    const humOut = humAvailable ? env.humidity : null;

    res.json({
      temperature: env.temperature,
      humidity: humOut,
      currentTemp: env.temperature,
      currentHumidity: humOut,

      targetTemp: m?.targetTemp ?? null,
      targetHumidity: dbH,
      lastSetpointAt: m?.lastSetpointAt ?? null,

      runtimeMinutes: Math.floor(env.runtimeMinutes),
      progress: exec?.progress ?? 0,
      currentSchedule: exec || null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ 即時監控失敗:", err);
    res.status(500).json({
      message: "取得監控資料失敗",
      error: err?.message || String(err),
    });
  }
});

/* ============================================================
   ⚙️ 取得所有機台（含目前/下一筆排程；可選載入 tests）
   GET /api/machines?withTests=0|1
   ✅ 同時回傳 previewFile（從檔案中心選取）
============================================================ */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const withTests = String(req.query.withTests ?? "1") !== "0";

    const include = [
      // ✅ 預覽圖
      {
        model: File,
        as: "previewFile",
        required: false,
        attributes: [
          "id",
          "displayName",
          "originalName",
          "mimeType",
          "ext",
          "size",
          "category",
          "createdAt",
        ],
      },
    ];

    if (withTests) {
      include.push({
        model: MachineTest,
        as: "tests",
        attributes: ["id", "testName", "status", "progress", "startTime", "endTime"],
      });
    }

    const machines = await Machine.findAll({
      attributes: [
        "id",
        ["name", "chamberName"],
        "model",
        "status",
        "location",
        "description",

        // ✅ setpoint
        "targetTemp",
        "targetHumidity",
        "lastSetpointAt",

        // ✅ 預覽圖外鍵
        "previewFileId",

        "createdAt",
      ],
      include,
      order: [["id", "ASC"]],
    });

    const enriched = await Promise.all(machines.map((m) => buildMachineOverview(m, now)));
    res.json(enriched);
  } catch (err) {
    console.error("❌ 取得機台資料失敗:", err);
    res.status(500).json({
      message: "取得機台資料失敗",
      error: err?.message || String(err),
    });
  }
});

/* ============================================================
   🔍 取得單一機台（含目前/下一筆排程；可選載入 tests）
   GET /api/machines/:id?withTests=0|1
   ✅ 同時回傳 previewFile
============================================================ */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "無效的機台 ID" });

    const withTests = String(req.query.withTests ?? "1") !== "0";

    const include = [
      {
        model: File,
        as: "previewFile",
        required: false,
        attributes: [
          "id",
          "displayName",
          "originalName",
          "mimeType",
          "ext",
          "size",
          "category",
          "createdAt",
        ],
      },
    ];

    if (withTests) {
      include.push({
        model: MachineTest,
        as: "tests",
        attributes: ["id", "testName", "status", "progress", "startTime", "endTime"],
      });
    }

    const machine = await Machine.findByPk(id, {
      attributes: [
        "id",
        ["name", "chamberName"],
        "model",
        "status",
        "location",
        "description",

        "targetTemp",
        "targetHumidity",
        "lastSetpointAt",

        "previewFileId",

        "createdAt",
      ],
      include,
    });

    if (!machine) return res.status(404).json({ message: "找不到該機台" });

    const now = new Date();
    const overview = await buildMachineOverview(machine, now);
    res.json(overview);
  } catch (err) {
    console.error("❌ 取得機台詳情失敗:", err);
    res.status(500).json({
      message: "取得機台詳情失敗",
      error: err?.message || String(err),
    });
  }
});

/* ============================================================
   🌡️ 調整機台 Setpoint（溫度/濕度）
   POST /api/machines/:id/setpoint
   body: { temperature: number, humidity?: number|null }
============================================================ */
router.post("/:id/setpoint", authMiddleware, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "無效的機台 ID" });

    const temperature = toNum(req.body?.temperature);
    let humidity =
      req.body?.humidity === "" || req.body?.humidity == null ? null : toNum(req.body?.humidity);

    if (temperature == null) {
      return res.status(400).json({ message: "temperature 為必填" });
    }
    if (temperature < TEMP_MIN || temperature > TEMP_MAX) {
      return res
        .status(400)
        .json({ message: `temperature 超出範圍 (${TEMP_MIN} ~ ${TEMP_MAX}°C)` });
    }

    // ✅ 若設定溫度 < 20°C → 強制不控濕（自動清除濕度）
    if (temperature < HUM_DISABLE_BELOW_TEMP) {
      humidity = null;
    }

    if (humidity != null && (humidity < HUM_MIN || humidity > HUM_MAX)) {
      return res
        .status(400)
        .json({ message: `humidity 超出範圍 (${HUM_MIN} ~ ${HUM_MAX}%)` });
    }

    const machine = await Machine.findByPk(id);
    if (!machine) return res.status(404).json({ message: "找不到該機台" });

    // 1) 先寫入 DB（確保 UI 立即可顯示 target）
    await machine.update({
      targetTemp: temperature,
      targetHumidity: humidity,
      lastSetpointAt: new Date(),
    });

    // 2) ✅ 讓 mock 即時溫濕度「跟著 setpoint」
    const nowTick = Date.now();
    const env = mockEnvCache.get(id) || {
      temperature: 25,
      humidity: 60,
      targetTemp: null,
      targetHumidity: null,
      lastTick: nowTick,
      runtimeMinutes: 0,
    };

    env.targetTemp = temperature;
    env.temperature = temperature; // 想慢慢靠近就註解

    if (humidity != null) {
      env.targetHumidity = humidity;
      env.humidity = humidity; // 想慢慢靠近就註解
    } else {
      env.targetHumidity = null;
    }

    env.lastTick = nowTick;
    mockEnvCache.set(id, env);

    // 3) 下發到硬體（mock/http 由 chamberControl 決定）
    const chamber = await sendChamberSetpoint(machine, temperature, humidity);

    // 4) 回傳同 GET /:id 的 overview（含 setpoint / currentSchedule / env / previewFile）
    const withTests = String(req.query.withTests ?? "1") !== "0";

    const include = [
      {
        model: File,
        as: "previewFile",
        required: false,
        attributes: ["id", "displayName", "originalName", "mimeType", "ext", "size", "category", "createdAt"],
      },
    ];

    if (withTests) {
      include.push({
        model: MachineTest,
        as: "tests",
        attributes: ["id", "testName", "status", "progress", "startTime", "endTime"],
      });
    }

    const machineView = await Machine.findByPk(id, {
      attributes: [
        "id",
        ["name", "chamberName"],
        "model",
        "status",
        "location",
        "description",
        "targetTemp",
        "targetHumidity",
        "lastSetpointAt",
        "previewFileId",
        "createdAt",
      ],
      include,
    });

    const overview = await buildMachineOverview(machineView, new Date());

    await logAction(req.user.id, "SET_MACHINE_SETPOINT", "machines", {
      recordId: id,
      note: `設定機台 #${id} setpoint：${temperature}°C${humidity != null ? ` / ${humidity}%` : ""}`,
      temperature,
      humidity,
    });

    if (!chamber?.ok) {
      return res.status(502).json({
        message: "Setpoint 已寫入資料庫，但下發到機台失敗",
        chamber,
        machine: overview,
      });
    }

    return res.json({
      message:
        temperature < HUM_DISABLE_BELOW_TEMP
          ? "Setpoint 已更新（<20°C 自動關閉濕度控制）"
          : "Setpoint 已更新",
      chamber,
      machine: overview,
    });
  } catch (err) {
    console.error("❌ 設定 setpoint 失敗:", err);
    return res.status(500).json({
      message: "設定 setpoint 失敗",
      error: err?.message || String(err),
    });
  }
});

/* ============================================================
   🧭 更新機台（status / previewFileId）
   PUT /api/machines/:id
   body: { status?: string, previewFileId?: number|null }
   ✅ 只有 admin 能帶 previewFileId
============================================================ */
router.put("/:id", authMiddleware, adminOnlyIfPreviewChange, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "無效的機台 ID" });

    const { status, previewFileId } = req.body || {};
    const machine = await Machine.findByPk(id);
    if (!machine) return res.status(404).json({ message: "找不到該機台" });

    const payload = {};

    // ✅ status 可選
    if (status != null) payload.status = status;

    // ✅ previewFileId 可選（允許 null 清除）—— 已由 adminOnlyIfPreviewChange 鎖住
    if (previewFileId !== undefined) {
      if (previewFileId === null || previewFileId === "" || Number(previewFileId) === 0) {
        payload.previewFileId = null;
      } else {
        const fid = Number(previewFileId);
        if (!Number.isFinite(fid)) {
          return res.status(400).json({ message: "previewFileId 無效" });
        }

        const f = await File.findByPk(fid);
        if (!f || f.isDeleted) return res.status(404).json({ message: "找不到該圖片檔案" });
        if (f.isFolder) return res.status(400).json({ message: "不可選擇資料夾作為預覽圖" });
        if (!String(f.mimeType || "").startsWith("image/")) {
          return res.status(400).json({ message: "請選擇圖片檔作為預覽圖" });
        }

        payload.previewFileId = fid;
      }
    }

    await machine.update(payload);

    await logAction(req.user.id, "UPDATE_MACHINE", "machines", {
      recordId: id,
      note: `更新機台 #${id}：${Object.keys(payload).join(", ")}`,
      ...payload,
    });

    const updated = await Machine.findByPk(id, {
      attributes: [
        "id",
        ["name", "chamberName"],
        "model",
        "status",
        "location",
        "description",
        "targetTemp",
        "targetHumidity",
        "lastSetpointAt",
        "previewFileId",
        "createdAt",
      ],
      include: [
        {
          model: File,
          as: "previewFile",
          required: false,
          attributes: [
            "id",
            "displayName",
            "originalName",
            "mimeType",
            "ext",
            "size",
            "category",
            "createdAt",
          ],
        },
      ],
    });

    res.json({ message: "更新成功", machine: updated });
  } catch (err) {
    console.error("❌ 更新機台狀態失敗:", err);
    res.status(500).json({
      message: "更新機台狀態失敗",
      error: err?.message || String(err),
    });
  }
});

/* ============================================================
   ❌ 刪除機台（✅ 建議 admin-only）
============================================================ */
router.delete("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "無效的機台 ID" });

    const deleted = await Machine.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: "找不到該機台" });
    res.json({ message: "刪除成功" });
  } catch (err) {
    console.error("❌ 刪除機台失敗:", err);
    res.status(500).json({
      message: "刪除機台失敗",
      error: err?.message || String(err),
    });
  }
});

/* ============================================================
   ▶️ 啟動機台（有排程時鎖定）
============================================================ */
router.put("/:id/start", authMiddleware, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "無效的機台 ID" });

    const machine = await Machine.findByPk(id);
    if (!machine) return res.status(404).json({ message: "找不到機台" });
    if (machine.status === "running") {
      return res.status(400).json({ message: "機台已在運轉中" });
    }

    const lockedSchedule = await findLockingSchedule(id);
    if (lockedSchedule) {
      return res.status(409).json({
        message: "此機台已設定排程，由排程自動控制啟動",
        schedule: {
          id: lockedSchedule.id,
          testName: lockedSchedule.testName,
          status: lockedSchedule.status,
          startTime: lockedSchedule.startTime,
          endTime: lockedSchedule.endTime,
        },
      });
    }

    const scheduleResult = await startMachineBySchedule(id);

    // ✅ 只更新 status（避免你 model 沒 updatedBy 欄位時出錯）
    await machine.update({ status: "running" });

    await logAction(req.user.id, "START_MACHINE", "machines", {
      recordId: machine.id,
      note: `啟動機台 #${machine.id}（${machine.name}）`,
    });

    res.json({ message: "機台已啟動", schedule: scheduleResult });
  } catch (err) {
    console.error("❌ 啟動機台失敗:", err);
    res.status(500).json({
      message: "啟動機台失敗",
      error: err?.message || String(err),
    });
  }
});

/* ============================================================
   ⏹️ 停止機台（有排程時鎖定）
============================================================ */
router.put("/:id/stop", authMiddleware, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "無效的機台 ID" });

    const user = req.user;
    const machine = await Machine.findByPk(id);
    if (!machine) return res.status(404).json({ message: "找不到機台" });
    if (machine.status !== "running") {
      return res.status(400).json({ message: "機台目前不是運轉中" });
    }

    const lockedSchedule = await findLockingSchedule(id);
    if (lockedSchedule) {
      return res.status(409).json({
        message: "此機台目前由排程控制，請在排程頁調整或取消排程",
        schedule: {
          id: lockedSchedule.id,
          testName: lockedSchedule.testName,
          status: lockedSchedule.status,
          startTime: lockedSchedule.startTime,
          endTime: lockedSchedule.endTime,
        },
      });
    }

    const result = await stopMachineAndSchedule(id);

    // ✅ 只更新 status（避免你 model 沒 updatedBy 欄位時出錯）
    await machine.update({ status: "idle" });

    await logAction(user.id, "STOP_MACHINE", "machines", {
      recordId: machine.id,
      note: `停止機台 #${machine.id}（${machine.name}）`,
    });

    if (result?.completedSchedule) {
      await logAction(user.id, "SCHEDULE_COMPLETED", "machine_schedules", {
        recordId: result.completedSchedule.id,
        note: `完成排程「${result.completedSchedule.testName}」`,
      });
    }

    if (result?.nextSchedule) {
      await logAction(user.id, "SCHEDULE_AUTO_START", "machine_schedules", {
        recordId: result.nextSchedule.id,
        note: `自動接續排程「${result.nextSchedule.testName}」`,
      });
    }

    res.json({ message: "機台已停止", result });
  } catch (err) {
    console.error("❌ 停止機台失敗:", err);
    res.status(500).json({
      message: "停止機台失敗",
      error: err?.message || String(err),
    });
  }
});

/* ============================================================
   📜 取得操作紀錄
============================================================ */
router.get("/:id/logs", authMiddleware, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "無效的機台 ID" });

    const logs = await AuditLog.findAll({
      where: {
        description: { [Op.like]: `%機台 #${id}%` },
      },
      include: [
        {
          model: User,
          as: "actor",
          attributes: ["username", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    res.json(logs);
  } catch (err) {
    console.error("❌ 取得紀錄失敗:", err);
    res.status(500).json({
      message: "取得紀錄失敗",
      error: err?.message || String(err),
    });
  }
});

export default router;
