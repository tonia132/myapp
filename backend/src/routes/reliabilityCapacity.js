// backend/src/routes/reliabilityCapacity.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import { Machine, MachineSchedule } from "../models/index.js";

const router = express.Router();

// ✅ 全域保護
router.use(authMiddleware);

/**
 * ✅ 視為「正在佔用機台」的排程狀態
 * 你專案曾出現 pending/running、也有 scheduled/running 版本 → 這裡做容錯
 */
const ACTIVE_SCHEDULE_STATUSES = ["pending", "running", "scheduled"];

/**
 * ✅ 只納入 Reliability 統計的 Chamber 範圍
 * Chamber 1~5：每台名目 2 slots
 * （Chamber 6 仍回傳，但不納入 summary，方便前端另做標記）
 */
const SUMMARY_CHAMBERS = new Set([1, 2, 3, 4, 5]);

/* ---------------- helpers ---------------- */

function hasAttr(model, key) {
  return !!model?.rawAttributes?.[key];
}

function toNum(v, def = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// 從機台名稱 / 代號抓 Chamber 編號（Chamber 1 / CH-2 / CH#3 ...）
function getChamberNo(m) {
  const src = String(m?.chamberName || m?.name || m?.code || m?.model || "");
  const match = src.match(/(?:chamber|ch)\s*[-#:]?\s*(\d+)/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isNaN(n) ? null : n;
}

// 嘗試從 Machine 資料上抓「目前溫度」欄位（若你 DB 沒存就會是 null）
function getCurrentTemp(m) {
  const candidates = ["currentTemp", "envTemp", "temperature", "temp"];
  for (const key of candidates) {
    const n = toNum(m?.[key], null);
    if (n != null) return n;
  }
  return null;
}

// 名目容量：Chamber 1~5 固定 2，其餘用 maxSlots/capacity/1
function getNominalSlots(m, chamberNo) {
  if (SUMMARY_CHAMBERS.has(chamberNo)) return 2;
  const s = toNum(m?.maxSlots, null) ?? toNum(m?.capacity, null) ?? 1;
  return Math.max(1, Math.floor(s));
}

/* =========================================================
   GET /api/reliability-capacity
   Query（可選）：
   - onlyChambers=1   -> 只回有 chamber 編號的機台
   - includeAll=1     -> summary 以外的機台也回傳（預設本來就會回，只影響你前端篩選）
========================================================= */
router.get("/", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");

    const now = new Date();
    const onlyChambers = String(req.query.onlyChambers ?? "0") === "1";

    // 1) 先抓全部機台（你也可以在這裡加 where，例如只抓 Reliability 群組）
    const machinesRaw = await Machine.findAll({
      // where: {...}  // ← 若你 Machine 有 category/group/type 欄位可在此過濾
      order: [["name", "ASC"]],
    });

    // 只回 chamber 機台（可選）
    const machines = onlyChambers
      ? machinesRaw.filter((m) => getChamberNo(m) != null)
      : machinesRaw;

    if (!machines.length) {
      return res.json({
        success: true,
        data: {
          summary: {
            totalMachines: 0,
            totalSlots: 0,
            usedSlots: 0,
            freeSlots: 0,
            utilization: 0,
          },
          machines: [],
        },
      });
    }

    const machineIds = machines.map((m) => m.id).filter(Boolean);

    // 2) 找出「現在」仍在佔用的排程
    //    - status in ACTIVE
    //    - startTime <= now
    //    - endTime >= now or endTime is null
    //    - isDeleted=false（若有）
    const scheduleWhere = {
      machineId: { [Op.in]: machineIds },
      status: { [Op.in]: ACTIVE_SCHEDULE_STATUSES },
      startTime: { [Op.lte]: now },
      [Op.or]: [{ endTime: { [Op.gte]: now } }, { endTime: null }],
    };
    if (hasAttr(MachineSchedule, "isDeleted")) scheduleWhere.isDeleted = false;

    // 3) 讀 active schedules：可選支援 slots 欄位（若你的 schedule 有記錄佔用格數）
    const scheduleAttrs = ["machineId"];
    if (hasAttr(MachineSchedule, "slots")) scheduleAttrs.push("slots");

    let activeSchedules = [];
    try {
      activeSchedules = await MachineSchedule.findAll({
        where: scheduleWhere,
        attributes: scheduleAttrs,
        raw: true,
      });
    } catch (err) {
      console.error("⚠️ 讀取 MachineSchedule 失敗，暫時視為無使用中排程:", err);
      activeSchedules = [];
    }

    // 4) 匯總佔用：{ [machineId]: usedSlots }
    const loadMap = new Map();
    for (const s of activeSchedules) {
      const mid = Number(s.machineId);
      if (!Number.isFinite(mid)) continue;

      // 若沒有 slots 欄位就視為 1
      const inc = hasAttr(MachineSchedule, "slots")
        ? Math.max(1, Math.floor(toNum(s.slots, 1)))
        : 1;

      loadMap.set(mid, (loadMap.get(mid) || 0) + inc);
    }

    // 5) 合併機台名目容量 + 目前佔用 → 算 free / utilization
    //    規則：Chamber 1~5 & temp < 20°C → 直接視為 100% 佔用
    let totalSlots = 0;
    let usedSlots = 0;
    let totalMachinesInSummary = 0;

    const machineRows = machines
      .map((m) => {
        const chamberNo = getChamberNo(m);
        const temp = getCurrentTemp(m);

        const nominalSlots = getNominalSlots(m, chamberNo);
        const usedBySchedules = Math.min(nominalSlots, loadMap.get(Number(m.id)) || 0);

        let used = usedBySchedules;
        let free = Math.max(nominalSlots - used, 0);
        let utilization =
          nominalSlots > 0 ? Number(((used / nominalSlots) * 100).toFixed(1)) : 0;

        // 規則：Chamber 1~5，且目前溫度 < 20°C → 視為滿載（不可再塞）
        if (SUMMARY_CHAMBERS.has(chamberNo) && temp != null && temp < 20) {
          used = nominalSlots;
          free = 0;
          utilization = 100;
        }

        const includeInSummary = SUMMARY_CHAMBERS.has(chamberNo);

        if (includeInSummary) {
          totalMachinesInSummary += 1;
          totalSlots += nominalSlots;
          usedSlots += used;
        }

        return {
          id: m.id,
          name: m.name,
          chamberName: m.chamberName,
          code: m.code,
          model: m.model,
          status: m.status,

          chamberNo,
          maxSlots: nominalSlots,

          usedSlots: used,
          freeSlots: free,
          utilization,

          temp,

          includeInSummary,
          isChamber6: chamberNo === 6,
        };
      })
      // 讓結果更好看：先 chamberNo，再 name
      .sort((a, b) => {
        const ca = a.chamberNo ?? 9999;
        const cb = b.chamberNo ?? 9999;
        if (ca !== cb) return ca - cb;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });

    const freeSlots = Math.max(totalSlots - usedSlots, 0);
    const totalUtilization =
      totalSlots > 0 ? Number(((usedSlots / totalSlots) * 100).toFixed(1)) : 0;

    return res.json({
      success: true,
      data: {
        summary: {
          totalMachines: totalMachinesInSummary, // ✅ 只算 Chamber 1~5
          totalSlots,
          usedSlots,
          freeSlots,
          utilization: totalUtilization,
        },
        machines: machineRows,
      },
    });
  } catch (err) {
    console.error("❌ 取得 Reliability 機台可工作容量失敗:", err);
    return res.status(500).json({
      success: false,
      message: "取得 Reliability 機台可工作容量失敗",
      error: err?.message || String(err),
    });
  }
});

export default router;
