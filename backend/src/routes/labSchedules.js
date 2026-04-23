// backend/src/routes/labSchedules.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import { LabSchedule, User } from "../models/index.js";
import { logAction } from "../utils/logAction.js";

const router = express.Router();
const sequelize = LabSchedule?.sequelize;

/* ---------------- Helpers ---------------- */

const norm = (v) => (v == null ? "" : String(v).trim());

const toInt = (v, def = 0) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() ||
    req.ip ||
    ""
  );
}
function getUA(req) {
  return req.headers["user-agent"] || "";
}

function isAdmin(user) {
  return String(user?.role || "").toLowerCase() === "admin";
}

/* ===== LabType / Status normalize ===== */

function normalizeLabType(v) {
  if (!v) return null;
  let s = String(v).toUpperCase();

  // 常見輸入： "EMC&SI", "EMC/SI", "EMC SI", "EMC-SI"
  s = s.replace(/\s+/g, "").replace(/[&/_-]/g, "");

  if (s === "EMS") return "EMS";
  if (s === "EMCSI" || s === "EMCＳI" || s === "EMCSI") return "EMCSI";
  if (s === "EMC" || s === "SI") return "EMCSI"; // 你若不想合併，可刪這行
  if (s === "IP") return "IP";
  if (s === "IK") return "IK";
  return null;
}

const STATUS_MAP = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  canceled: "canceled",
  cancelled: "canceled",
  finished: "finished",
};

function normalizeStatus(v) {
  if (!v) return null;
  const key = String(v).toLowerCase().trim();
  return STATUS_MAP[key] || null;
}

/* ===== date / time validate ===== */

function isYYYYMMDD(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ""))) return false;
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  // 避免 2025-02-30 這種被 JS 自動進位
  const [yy, mm, dd] = s.split("-").map((x) => Number(x));
  return (
    d.getFullYear() === yy &&
    d.getMonth() + 1 === mm &&
    d.getDate() === dd
  );
}

function parseTimeToMinutes(s) {
  const t = String(s || "").trim();
  // 支援 HH:mm 或 HH:mm:ss
  const m = t.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = m[3] != null ? Number(m[3]) : 0;
  if (
    !Number.isFinite(hh) ||
    !Number.isFinite(mm) ||
    !Number.isFinite(ss) ||
    hh < 0 ||
    hh > 23 ||
    mm < 0 ||
    mm > 59 ||
    ss < 0 ||
    ss > 59
  ) {
    return null;
  }
  return hh * 60 + mm + (ss > 0 ? 0 : 0); // 秒數不影響分級比較（你的欄位多半是 HH:mm）
}

function assertTimeRange(startTime, endTime) {
  const s = parseTimeToMinutes(startTime);
  const e = parseTimeToMinutes(endTime);
  if (s == null || e == null) return { ok: false, message: "時間格式需為 HH:mm（或 HH:mm:ss）" };
  if (e <= s) return { ok: false, message: "結束時間必須晚於開始時間" };
  return { ok: true, sMin: s, eMin: e };
}

/* ===== status transition (admin) ===== */
function canAdminTransition(from, to) {
  if (!from || !to) return false;
  if (from === to) return true;

  const allow = {
    pending: ["approved", "rejected", "canceled"],
    approved: ["finished", "canceled"],
    rejected: [], // 若你想允許退回重審：["pending"]
    canceled: [], // 若你想允許復原：["pending"]
    finished: [], // finished 不建議再改
  };

  return (allow[from] || []).includes(to);
}

/**
 * ✅ MySQL/MariaDB 併發保護：同 labType + date 取得 named lock
 * - 讓同一天同實驗室「先檢查衝突再新增/修改」不會被兩個請求同時穿透
 */
async function withLabDateLock(labType, date, fn, { timeoutSec = 5 } = {}) {
  if (!sequelize) return fn();
  const dialect = sequelize.getDialect?.();
  const key = `labSchedule:${labType}:${date}`;

  if (!["mysql", "mariadb"].includes(String(dialect || ""))) {
    return fn();
  }

  // GET_LOCK 回 1 才成功
  const [rows] = await sequelize.query(
    "SELECT GET_LOCK(:k, :t) AS got",
    { replacements: { k: key, t: timeoutSec } }
  );
  const got = rows?.[0]?.got;
  if (Number(got) !== 1) {
    const err = new Error("LOCK_TIMEOUT");
    err.code = "LOCK_TIMEOUT";
    throw err;
  }

  try {
    return await fn();
  } finally {
    await sequelize.query("SELECT RELEASE_LOCK(:k)", { replacements: { k: key } }).catch(() => {});
  }
}

/**
 * 檢查同一實驗室、同一天是否時間重疊
 * [start, end) 與 [s.startTime, s.endTime) 是否相交
 */
async function hasConflict({ labType, date, startTime, endTime, ignoreId, transaction, lock }) {
  const where = {
    labType,
    date,
    status: { [Op.notIn]: ["canceled", "rejected"] },
    [Op.and]: [
      { startTime: { [Op.lt]: endTime } }, // existing.start < newEnd
      { endTime: { [Op.gt]: startTime } }, // existing.end > newStart
    ],
  };
  if (ignoreId) where.id = { [Op.ne]: ignoreId };

  const hit = await LabSchedule.findOne({
    where,
    transaction,
    lock,
  });
  return !!hit;
}

/* =========================================================
   POST /api/lab-schedules
   ➜ 一般使用者建立排程
   body: { labType, date, startTime, endTime, purpose, remark }
========================================================= */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { labType, date, startTime, endTime, purpose, remark } = req.body || {};

    const type = normalizeLabType(labType);
    if (!type) return res.status(400).json({ success: false, message: "實驗室類型無效" });

    if (!date || !isYYYYMMDD(date)) {
      return res.status(400).json({ success: false, message: "請選擇正確日期（YYYY-MM-DD）" });
    }

    const tr = assertTimeRange(startTime, endTime);
    if (!tr.ok) return res.status(400).json({ success: false, message: tr.message });

    if (!norm(purpose)) {
      return res.status(400).json({ success: false, message: "請填寫用途說明" });
    }

    // ✅ 併發保護（MySQL/MariaDB）：同 lab + date 先搶鎖
    const schedule = await withLabDateLock(type, date, async () => {
      const t = await LabSchedule.sequelize.transaction();
      try {
        const conflict = await hasConflict({
          labType: type,
          date,
          startTime,
          endTime,
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (conflict) {
          await t.rollback();
          return null;
        }

        const created = await LabSchedule.create(
          {
            labType: type,
            date,
            startTime,
            endTime,
            purpose: norm(purpose),
            remark: norm(remark),
            userId: req.user.id,
            status: "pending",
          },
          { transaction: t }
        );

        await t.commit();
        return created;
      } catch (e) {
        await t.rollback();
        throw e;
      }
    });

    if (!schedule) {
      return res.status(409).json({
        success: false,
        message: "該實驗室在此時段已有排程，請改其他時間",
      });
    }

    logAction(req.user.id, "CREATE_LAB_SCHEDULE", "lab_schedules", {
      recordId: schedule.id,
      note: `新增 ${type} 實驗室排程 ${date} ${startTime}~${endTime}`,
      meta: { ip: getClientIp(req), ua: getUA(req) },
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: "✅ 已建立排程，待管理員確認",
      data: schedule,
    });
  } catch (err) {
    if (err?.code === "LOCK_TIMEOUT") {
      return res.status(409).json({ success: false, message: "系統忙碌，請稍後再試（排程鎖等待逾時）" });
    }
    console.error("❌ 建立實驗室排程失敗:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   GET /api/lab-schedules/day
   ➜ 查詢某一天 / 某實驗室的排程（含申請人）
   query: labType=EMS&date=2025-11-18&includeCanceled=0
========================================================= */
router.get("/day", authMiddleware, async (req, res) => {
  try {
    const type = normalizeLabType(req.query.labType || "");
    const date = req.query.date;
    const includeCanceled = String(req.query.includeCanceled || "0") === "1";
    const includeRejected = String(req.query.includeRejected || "0") === "1";

    if (!type || !date || !isYYYYMMDD(date)) {
      return res.status(400).json({ success: false, message: "請提供 labType 與正確 date（YYYY-MM-DD）" });
    }

    const where = { labType: type, date };
    if (!includeCanceled || !includeRejected) {
      where.status = {};
      const notIn = [];
      if (!includeCanceled) notIn.push("canceled");
      if (!includeRejected) notIn.push("rejected");
      if (notIn.length) where.status[Op.notIn] = notIn;
    }

    const rows = await LabSchedule.findAll({
      where,
      include: [
        {
          model: User,
          as: "requester",
          attributes: ["id", "username", "name"],
        },
      ],
      order: [
        ["date", "ASC"],
        ["startTime", "ASC"],
      ],
    });

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ 取得當日實驗室排程失敗:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   GET /api/lab-schedules/range
   ➜ 給月曆用：查日期區間
   query: labType=EMS&fromDate=2025-11-01&toDate=2025-11-30
========================================================= */
router.get("/range", authMiddleware, async (req, res) => {
  try {
    const type = normalizeLabType(req.query.labType || "");
    const from = req.query.fromDate;
    const to = req.query.toDate;

    if (!type) return res.status(400).json({ success: false, message: "labType 必填" });
    if ((from && !isYYYYMMDD(from)) || (to && !isYYYYMMDD(to))) {
      return res.status(400).json({ success: false, message: "fromDate/toDate 格式需為 YYYY-MM-DD" });
    }

    const where = { labType: type };
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const rows = await LabSchedule.findAll({
      where,
      include: [
        { model: User, as: "requester", attributes: ["id", "username", "name"] },
      ],
      order: [
        ["date", "ASC"],
        ["startTime", "ASC"],
      ],
    });

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ 取得區間實驗室排程失敗:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   GET /api/lab-schedules/mine
   ➜ 查詢「我自己」的排程（支援分頁）
   query: labType, status, fromDate, toDate, page, pageSize
========================================================= */
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const type = normalizeLabType(req.query.labType || "");
    const status = normalizeStatus(req.query.status || "");
    const from = req.query.fromDate;
    const to = req.query.toDate;

    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = clamp(toInt(req.query.pageSize, 50), 1, 200);

    const where = { userId: req.user.id };
    if (type) where.labType = type;
    if (status) where.status = status;

    if (from || to) {
      if ((from && !isYYYYMMDD(from)) || (to && !isYYYYMMDD(to))) {
        return res.status(400).json({ success: false, message: "fromDate/toDate 格式需為 YYYY-MM-DD" });
      }
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const { rows, count } = await LabSchedule.findAndCountAll({
      where,
      order: [
        ["date", "DESC"],
        ["startTime", "ASC"],
      ],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    res.json({ success: true, data: { rows, count, page, pageSize } });
  } catch (err) {
    console.error("❌ 取得我的實驗室排程失敗:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   GET /api/lab-schedules
   ➜ 管理員列表檢視（分頁）
   query: labType, status, user, fromDate, toDate, page, pageSize
========================================================= */
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "僅管理員可以檢視所有排程" });
    }

    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = clamp(toInt(req.query.pageSize, 20), 1, 200);

    const type = normalizeLabType(req.query.labType || "");
    const status = normalizeStatus(req.query.status || "");
    const from = req.query.fromDate;
    const to = req.query.toDate;
    const userKeyword = norm(req.query.user || "");

    const where = {};
    if (type) where.labType = type;
    if (status) where.status = status;

    if (from || to) {
      if ((from && !isYYYYMMDD(from)) || (to && !isYYYYMMDD(to))) {
        return res.status(400).json({ success: false, message: "fromDate/toDate 格式需為 YYYY-MM-DD" });
      }
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const userWhere = {};
    if (userKeyword) {
      userWhere[Op.or] = [
        { username: { [Op.like]: `%${userKeyword}%` } },
        { name: { [Op.like]: `%${userKeyword}%` } },
      ];
    }

    const { rows, count } = await LabSchedule.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "requester",
          attributes: ["id", "username", "name"],
          where: Object.keys(userWhere).length ? userWhere : undefined,
          required: Object.keys(userWhere).length ? true : false,
        },
      ],
      order: [
        ["date", "DESC"],
        ["startTime", "ASC"],
      ],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      distinct: true,
    });

    // ✅ 兼容你原本輸出（rows/total/page...） + 統一 data
    res.json({
      success: true,
      rows,
      total: count,
      page,
      pageSize,
      data: { rows, count, page, pageSize },
    });
  } catch (err) {
    console.error("❌ 管理員取得實驗室排程失敗:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   PATCH /api/lab-schedules/:id
   ➜ 管理員：更新狀態 / 管理員備註 /（可選）調整時間
   ➜ 一般使用者：僅可取消自己的排程（pending/approved）
   body:
     - admin: { status?, adminRemark?, date?, startTime?, endTime?, purpose?, remark? }
     - user : { status: "canceled" }
========================================================= */
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "id 無效" });

    const schedule = await LabSchedule.findByPk(id);
    if (!schedule) return res.status(404).json({ success: false, message: "找不到排程" });

    const admin = isAdmin(req.user);
    const owner = Number(schedule.userId) === Number(req.user.id);
    if (!admin && !owner) {
      return res.status(403).json({ success: false, message: "無權限操作此排程" });
    }

    const body = req.body || {};

    // ========= 一般使用者：只允許取消 =========
    if (!admin) {
      const s = normalizeStatus(body.status);
      if (s !== "canceled") {
        return res.status(403).json({ success: false, message: "使用者僅可取消自己的排程（status=canceled）" });
      }
      if (!["pending", "approved"].includes(String(schedule.status || ""))) {
        return res.status(400).json({ success: false, message: "此排程狀態無法取消" });
      }

      await schedule.update({ status: "canceled" });

      logAction(req.user.id, "CANCEL_LAB_SCHEDULE", "lab_schedules", {
        recordId: schedule.id,
        note: `取消排程：${schedule.labType} ${schedule.date} ${schedule.startTime}~${schedule.endTime}`,
        meta: { ip: getClientIp(req), ua: getUA(req) },
      }).catch(() => {});

      return res.json({ success: true, message: "✅ 已取消排程", data: schedule });
    }

    // ========= 管理員：可更新狀態/備註/（可選）調整時間內容 =========
    const payload = {};

    if (body.adminRemark !== undefined) payload.adminRemark = norm(body.adminRemark);

    // status transition
    if (body.status !== undefined) {
      const nextStatus = normalizeStatus(body.status);
      if (!nextStatus) return res.status(400).json({ success: false, message: "狀態值無效" });

      const from = String(schedule.status || "");
      if (!canAdminTransition(from, nextStatus)) {
        return res.status(400).json({
          success: false,
          message: `不允許狀態轉換：${from} → ${nextStatus}`,
        });
      }
      payload.status = nextStatus;
    }

    // ✅（可選）允許管理員調整日期/時間/用途（會做衝突檢查）
    const willEditTime =
      body.date !== undefined ||
      body.startTime !== undefined ||
      body.endTime !== undefined;

    const newDate = body.date !== undefined ? String(body.date).trim() : schedule.date;
    const newStart = body.startTime !== undefined ? String(body.startTime).trim() : schedule.startTime;
    const newEnd = body.endTime !== undefined ? String(body.endTime).trim() : schedule.endTime;

    if (willEditTime) {
      if (!newDate || !isYYYYMMDD(newDate)) {
        return res.status(400).json({ success: false, message: "date 格式需為 YYYY-MM-DD" });
      }
      const tr = assertTimeRange(newStart, newEnd);
      if (!tr.ok) return res.status(400).json({ success: false, message: tr.message });

      payload.date = newDate;
      payload.startTime = newStart;
      payload.endTime = newEnd;
    }

    if (body.purpose !== undefined) payload.purpose = norm(body.purpose);
    if (body.remark !== undefined) payload.remark = norm(body.remark);

    // 若調整時間，做衝突檢查（同 lab + date）
    const updated = await withLabDateLock(schedule.labType, newDate, async () => {
      const t = await LabSchedule.sequelize.transaction();
      try {
        if (willEditTime) {
          const conflict = await hasConflict({
            labType: schedule.labType,
            date: newDate,
            startTime: newStart,
            endTime: newEnd,
            ignoreId: schedule.id,
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          if (conflict) {
            await t.rollback();
            return null;
          }
        }

        await schedule.update(payload, { transaction: t });
        await t.commit();
        return schedule;
      } catch (e) {
        await t.rollback();
        throw e;
      }
    });

    if (!updated) {
      return res.status(409).json({
        success: false,
        message: "該實驗室在此時段已有排程（衝突），請改其他時間",
      });
    }

    logAction(req.user.id, "UPDATE_LAB_SCHEDULE", "lab_schedules", {
      recordId: schedule.id,
      note: `更新排程：${schedule.labType} ${schedule.date} ${schedule.startTime}~${schedule.endTime}`,
      meta: { ip: getClientIp(req), ua: getUA(req), payload: Object.keys(payload) },
    }).catch(() => {});

    res.json({ success: true, message: "✅ 已更新排程", data: schedule });
  } catch (err) {
    if (err?.code === "LOCK_TIMEOUT") {
      return res.status(409).json({ success: false, message: "系統忙碌，請稍後再試（排程鎖等待逾時）" });
    }
    console.error("❌ 更新實驗室排程失敗:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

export default router;
