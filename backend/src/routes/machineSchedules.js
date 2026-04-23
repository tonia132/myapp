// backend/src/routes/machineSchedules.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import { logAction } from "../utils/logAction.js";
import { MachineSchedule, Machine, User } from "../models/index.js";

const router = express.Router();

// 全域保護
router.use(authMiddleware);

// ✅ 視為「會擋住別人排程」的狀態（對應 model: pending / running / completed / canceled）
const ACTIVE_SCHEDULE_STATUS = ["pending", "running"];

/* --------------------- 小工具 --------------------- */

// 安全轉日期（回傳 Date 或 null）
function parseDate(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// 組區間重疊 where 子句
// 兩段 [Astart, Aend) 與 [Bstart, Bend) 重疊條件：Astart < Bend 且 Aend > Bstart
function overlapWhere(start, end) {
  return {
    [Op.and]: [{ startTime: { [Op.lt]: end } }, { endTime: { [Op.gt]: start } }],
  };
}

/**
 * status 白名單（避免塞入奇怪字）
 */
const STATUS_WHITELIST = new Set(["pending", "running", "completed", "canceled"]);
function normalizeStatus(v, fallback = null) {
  if (v == null) return fallback;
  const s = String(v).trim().toLowerCase();
  return STATUS_WHITELIST.has(s) ? s : fallback;
}

/**
 * number or null
 */
function toNumOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* --------------------- 取得列表 --------------------- */
/**
 * GET /api/machine-schedules
 * query:
 *   machineId?: number
 *   userId?: number           // 排程使用者
 *   start?: ISOString
 *   end?: ISOString
 *   status?: string           // pending|running|completed|canceled
 *   keyword?: string          // like testName
 *   includeDeleted?: 0|1      // (可選) 是否顯示軟刪除
 *   page?: number = 1
 *   pageSize?: number = 50    // capped at 200
 */
router.get("/", async (req, res) => {
  try {
    const {
      machineId,
      userId,
      start,
      end,
      status,
      keyword,
      includeDeleted = "0",
      page = "1",
      pageSize = "50",
    } = req.query;

    const ps = Math.max(1, parseInt(page, 10) || 1);
    const sz = Math.max(1, Math.min(200, parseInt(pageSize, 10) || 50));

    const where = {};

    // ✅ 軟刪除預設不顯示
    if (String(includeDeleted) !== "1") where.isDeleted = false;

    if (machineId) {
      const mid = Number(machineId);
      if (Number.isFinite(mid)) where.machineId = mid;
    }

    if (userId) {
      const uid = Number(userId);
      if (Number.isFinite(uid)) where.userId = uid;
    }

    // 區間過濾（重疊語意）
    const s = start ? parseDate(start) : null;
    const e = end ? parseDate(end) : null;
    if (s && e) Object.assign(where, overlapWhere(s, e));
    else if (s && !e) where.endTime = { [Op.gte]: s };
    else if (!s && e) where.startTime = { [Op.lte]: e };

    const st = normalizeStatus(status, null);
    if (status && !st) {
      return res.status(400).json({ message: "status 無效" });
    }
    if (st) where.status = st;

    if (keyword) {
      where.testName = { [Op.like]: `%${String(keyword).trim()}%` };
    }

    const { rows, count } = await MachineSchedule.findAndCountAll({
      where,
      include: [
        {
          model: Machine,
          as: "machine",
          attributes: ["id", "name", "model"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "username"],
        },
      ],
      order: [
        ["startTime", "DESC"],
        ["id", "DESC"],
      ],
      offset: (ps - 1) * sz,
      limit: sz,
    });

    res.json({ rows, total: count, page: ps, pageSize: sz });
  } catch (err) {
    console.error("GET /machine-schedules", err);
    res.status(500).json({ message: "取得排程失敗" });
  }
});

/* --------------------- 取得單筆 --------------------- */
/**
 * GET /api/machine-schedules/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "無效的 ID" });
    }

    const item = await MachineSchedule.findByPk(id, {
      include: [
        { model: Machine, as: "machine", attributes: ["id", "name", "model"] },
        { model: User, as: "user", attributes: ["id", "name", "username"] },
      ],
    });
    if (!item) return res.status(404).json({ message: "排程不存在" });
    res.json(item);
  } catch (err) {
    console.error("GET /machine-schedules/:id", err);
    res.status(500).json({ message: "取得排程失敗" });
  }
});

/* --------------------- 建立排程 --------------------- */
/**
 * POST /api/machine-schedules
 * body: {
 *   machineId,
 *   testName,
 *   startTime,
 *   endTime,
 *   remark,
 *   status? = pending,
 *   userId?,                 // 排程使用者 ID（可選）
 *   userName?,               // 排程使用者名稱（可選）
 * }
 */
router.post("/", async (req, res) => {
  try {
    const {
      machineId,
      testName,
      startTime,
      endTime,
      remark,
      status,
      userId,
      userName,
    } = req.body || {};

    if (!machineId || !testName) {
      return res.status(400).json({ message: "machineId 與 testName 必填" });
    }

    const mid = Number(machineId);
    if (!Number.isFinite(mid)) {
      return res.status(400).json({ message: "machineId 無效" });
    }

    const s = parseDate(startTime);
    const e = parseDate(endTime);
    if (!s || !e) {
      return res.status(400).json({ message: "startTime / endTime 格式錯誤" });
    }
    if (e <= s) {
      return res.status(400).json({ message: "endTime 必須大於 startTime" });
    }

    const st = normalizeStatus(status, "pending");
    if (!st) {
      return res.status(400).json({ message: "status 無效" });
    }

    // 🔒 衝突偵測（同機台時間重疊就擋，只看 pending / running；且不看軟刪除）
    const conflict = await MachineSchedule.findOne({
      where: {
        machineId: mid,
        isDeleted: false,
        status: { [Op.in]: ACTIVE_SCHEDULE_STATUS },
        ...overlapWhere(s, e),
      },
    });
    if (conflict) {
      return res.status(409).json({
        code: "TIME_OVERLAP",
        message: "與現有排程時間重疊",
        conflict: {
          id: conflict.id,
          testName: conflict.testName,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
        },
      });
    }

    const created = await MachineSchedule.create({
      machineId: mid,
      testName: String(testName).trim(),
      startTime: s,
      endTime: e,
      remark: remark == null ? null : String(remark),
      status: st,
      // 排程使用者資訊（可以跟 createdBy 不同）
      userId: toNumOrNull(userId),
      userName: userName == null || userName === "" ? null : String(userName),
      createdBy: req.user?.id ?? null,
      isDeleted: false,
    });

    logAction(req.user.id, "CREATE_MACHINE_SCHEDULE", "machine_schedules", {
      recordId: created.id,
      note: `建立排程「${created.testName}」`,
    }).catch(() => {});

    res.status(201).json(created);
  } catch (err) {
    console.error("POST /machine-schedules", err);
    res.status(500).json({ message: "建立排程失敗" });
  }
});

/* --------------------- 更新排程 --------------------- */
/**
 * PUT /api/machine-schedules/:id
 * body: 可部分更新；同樣做衝突偵測（忽略自己）
 * 可更新：
 *   machineId, testName, startTime, endTime, remark, status,
 *   userId?, userName?
 */
router.put("/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "無效的 ID" });
    }

    const item = await MachineSchedule.findByPk(id);
    if (!item) return res.status(404).json({ message: "排程不存在" });

    if (item.isDeleted) {
      return res.status(410).json({ message: "排程已刪除" });
    }

    const {
      machineId,
      testName,
      startTime,
      endTime,
      remark,
      status,
      userId,
      userName,
    } = req.body || {};
    const payload = {};

    if (machineId !== undefined) {
      const mid = toNumOrNull(machineId);
      if (mid == null) return res.status(400).json({ message: "machineId 無效" });
      payload.machineId = mid;
    }
    if (testName !== undefined) payload.testName = String(testName).trim();
    if (remark !== undefined) payload.remark = remark == null ? null : String(remark);

    if (status !== undefined) {
      const st = normalizeStatus(status, null);
      if (!st) return res.status(400).json({ message: "status 無效" });
      payload.status = st;
    }

    // 使用者欄位可更新 / 清空
    if (userId !== undefined) {
      payload.userId = toNumOrNull(userId);
    }
    if (userName !== undefined) {
      payload.userName = userName == null || userName === "" ? null : String(userName);
    }

    let newStart = item.startTime;
    let newEnd = item.endTime;

    if (startTime !== undefined) {
      const s = parseDate(startTime);
      if (!s) return res.status(400).json({ message: "startTime 格式錯誤" });
      newStart = s;
      payload.startTime = s;
    }
    if (endTime !== undefined) {
      const e = parseDate(endTime);
      if (!e) return res.status(400).json({ message: "endTime 格式錯誤" });
      newEnd = e;
      payload.endTime = e;
    }

    if (newEnd <= newStart) {
      return res.status(400).json({ message: "endTime 必須大於 startTime" });
    }

    // 如果更新造成時間或機台改變，做衝突偵測（忽略自己；不看軟刪除）
    const targetMachineId = payload.machineId ?? item.machineId;
    const conflict = await MachineSchedule.findOne({
      where: {
        id: { [Op.ne]: id },
        machineId: targetMachineId,
        isDeleted: false,
        status: { [Op.in]: ACTIVE_SCHEDULE_STATUS },
        ...overlapWhere(newStart, newEnd),
      },
    });
    if (conflict) {
      return res.status(409).json({
        code: "TIME_OVERLAP",
        message: "與現有排程時間重疊",
        conflict: {
          id: conflict.id,
          testName: conflict.testName,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
        },
      });
    }

    await item.update(payload);

    logAction(req.user.id, "UPDATE_MACHINE_SCHEDULE", "machine_schedules", {
      recordId: item.id,
      note: `更新排程「${item.testName}」`,
    }).catch(() => {});

    res.json(item);
  } catch (err) {
    console.error("PUT /machine-schedules/:id", err);
    res.status(500).json({ message: "更新排程失敗" });
  }
});

/* --------------------- 刪除排程（軟刪除） --------------------- */
/**
 * DELETE /api/machine-schedules/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "無效的 ID" });
    }

    const item = await MachineSchedule.findByPk(id);
    if (!item) return res.status(404).json({ message: "排程不存在" });

    if (item.isDeleted) return res.json({ ok: true });

    // ✅ 配合 model 的 isDeleted 做軟刪除
    await item.update({ isDeleted: true });

    logAction(req.user.id, "DELETE_MACHINE_SCHEDULE", "machine_schedules", {
      recordId: id,
      note: "刪除排程（軟刪除）",
    }).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /machine-schedules/:id", err);
    res.status(500).json({ message: "刪除排程失敗" });
  }
});

export default router;
