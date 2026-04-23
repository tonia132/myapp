// backend/src/routes/testSupport.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRole from "../middleware/roleMiddleware.js";
import { TestSupport, User } from "../models/index.js";
import { logAction } from "../utils/logAction.js";

const router = express.Router();

/* ---------------- helpers ---------------- */
const clean = (v) => String(v ?? "").trim();
const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
};
const toNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const isAdmin = (u) => String(u?.role || "").toLowerCase() === "admin";

/** ✅ 安全 include：association 存在才 include */
function assocInclude(model, alias, attributes, extra = {}) {
  if (!model?.associations || !model.associations[alias]) return null;
  return { association: alias, attributes, required: false, ...extra };
}

/** ✅ allowlist + normalize */
const STATUS_ALLOW = new Set(["done", "doing", "pending"]);
const TESTTYPE_ALLOW = new Set(["system", "reli", "rma", "cert", "other"]);

function normalizeStatus(v, def = null) {
  if (v == null || v === "") return def;
  const s = String(v).trim().toLowerCase();
  // 相容中文/舊值（可按你系統擴充）
  if (s === "已完成") return "done";
  if (s === "進行中") return "doing";
  if (s === "待處理") return "pending";
  if (STATUS_ALLOW.has(s)) return s;
  return null;
}

function normalizeTestType(v, def = null) {
  if (v == null || v === "") return def;
  const s = String(v).trim().toLowerCase();
  if (TESTTYPE_ALLOW.has(s)) return s;
  return null;
}

/** ✅ YYYY-MM-DD 基本檢查（不嚴格轉 Date，避免時區問題） */
function isYYYYMMDD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}

/* =========================================================
   📋 取得測試支援紀錄列表
   GET /api/test-support
   query:
    - limit (default 50, max 200)
    - page (default 1)
    - from/to YYYY-MM-DD
    - mine=1 (只看自己)；mine=0 只有 admin 才能用
    - status: done/doing/pending
    - testType: system/reli/rma/cert/other
    - supporterId:（可選）只有 admin 可用
========================================================= */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { from, to } = req.query;

    const page = Math.max(1, toInt(req.query.page, 1));
    let limit = toInt(req.query.limit, 50);
    if (limit <= 0) limit = 50;
    if (limit > 200) limit = 200;

    const mine = String(req.query.mine ?? "").trim(); // "1" | "0" | ""
    const statusNorm = normalizeStatus(req.query.status, null);
    const testTypeNorm = normalizeTestType(req.query.testType, null);

    // ✅ 非法狀態/類型直接擋掉（避免怪值進 where / DB）
    if (req.query.status != null && req.query.status !== "" && !statusNorm) {
      return res.status(400).json({ message: "status 不合法（done/doing/pending）" });
    }
    if (req.query.testType != null && req.query.testType !== "" && !testTypeNorm) {
      return res.status(400).json({ message: "testType 不合法（system/reli/rma/cert/other）" });
    }

    const where = {};

    // 日期區間
    if (from || to) {
      where.supportDate = {};
      if (from) {
        if (!isYYYYMMDD(from)) return res.status(400).json({ message: "from 必須是 YYYY-MM-DD" });
        where.supportDate[Op.gte] = from;
      }
      if (to) {
        if (!isYYYYMMDD(to)) return res.status(400).json({ message: "to 必須是 YYYY-MM-DD" });
        where.supportDate[Op.lte] = to;
      }
    }

    // status / testType
    if (statusNorm) where.status = statusNorm;
    if (testTypeNorm) where.testType = testTypeNorm;

    // 權限：非 admin 預設只能看自己（不帶 mine 也一樣）
    if (!isAdmin(req.user)) {
      where.supporterId = req.user.id;
    } else {
      // admin：mine=1 只看自己；mine=0 看全部
      if (mine === "1") where.supporterId = req.user.id;

      // admin 可額外用 supporterId 篩選
      if (req.query.supporterId != null && req.query.supporterId !== "") {
        const sid = toInt(req.query.supporterId, 0);
        if (!sid) return res.status(400).json({ message: "supporterId 格式不正確" });
        where.supporterId = sid;
      }
    }

    // include supporter（安全）
    const include = [
      assocInclude(TestSupport, "supporter", ["id", "username", "name"]),
    ].filter(Boolean);

    const { rows, count } = await TestSupport.findAndCountAll({
      where,
      include,
      order: [
        ["supportDate", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    const list = rows.map((row) => {
      const data = row.toJSON();
      return {
        id: data.id,
        supportDate: data.supportDate,
        requesterDept: data.requesterDept,
        requester: data.requester,
        projectName: data.projectName,
        testType: data.testType,
        relatedNo: data.relatedNo,
        testContent: data.testContent,
        hours: data.hours,
        status: data.status,
        note: data.note,
        supporterId: data.supporterId,
        supporterName: data.supporter?.name || data.supporter?.username || null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    // ✅ 不破壞前端（仍回陣列），但提供分頁資訊（Header）
    res.setHeader("X-Total-Count", String(count));
    res.setHeader("X-Page", String(page));
    res.setHeader("X-Page-Size", String(limit));

    return res.json(list);
  } catch (err) {
    console.error("❌ 取得測試支援列表失敗:", err);
    return res.status(500).json({ message: "取得測試支援列表失敗", error: err.message });
  }
});

/* =========================================================
   ✏️ 新增一筆測試支援紀錄
   POST /api/test-support
========================================================= */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      supportDate,
      requesterDept,
      requester,
      projectName,
      testType,
      relatedNo,
      testContent,
      hours,
      status,
      note,
      supporterId,
    } = req.body || {};

    // 必填檢查
    if (!supportDate || !requesterDept || !projectName || !testContent || hours == null || supporterId == null) {
      return res.status(400).json({
        message: "缺少必要欄位：supportDate、requesterDept、projectName、testContent、hours、supporterId",
      });
    }
    if (!isYYYYMMDD(supportDate)) return res.status(400).json({ message: "supportDate 必須是 YYYY-MM-DD" });

    const parsedHours = toNum(hours, NaN);
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      return res.status(400).json({ message: "hours 必須為大於 0 的數值" });
    }

    const finalSupporterId = toInt(supporterId, 0);
    if (!finalSupporterId) {
      return res.status(400).json({ message: "支援人員（supporterId）格式不正確" });
    }

    const supporter = await User.findByPk(finalSupporterId, { attributes: ["id", "username", "name"] });
    if (!supporter) return res.status(400).json({ message: "指定的支援人員不存在" });

    const testTypeNorm = normalizeTestType(testType, "system") || "system";
    const statusNorm = normalizeStatus(status, "done") || "done";

    const created = await TestSupport.create({
      supportDate,
      requesterDept: clean(requesterDept),
      requester: clean(requester) || null,
      projectName: clean(projectName),
      testType: testTypeNorm,
      relatedNo: clean(relatedNo) || null,
      testContent: clean(testContent),
      hours: parsedHours,
      status: statusNorm,
      note: clean(note) || null,
      supporterId: finalSupporterId,
    });

    const withUser = await TestSupport.findByPk(created.id, {
      include: [
        assocInclude(TestSupport, "supporter", ["id", "username", "name"]),
      ].filter(Boolean),
    });

    const data = withUser?.toJSON ? withUser.toJSON() : created.toJSON();

    const result = {
      id: data.id,
      supportDate: data.supportDate,
      requesterDept: data.requesterDept,
      requester: data.requester,
      projectName: data.projectName,
      testType: data.testType,
      relatedNo: data.relatedNo,
      testContent: data.testContent,
      hours: data.hours,
      status: data.status,
      note: data.note,
      supporterId: data.supporterId,
      supporterName: data.supporter?.name || data.supporter?.username || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    // ✅ logAction：用你系統其它路由一致的格式
    logAction(req.user?.id || null, "CREATE_TEST_SUPPORT", "test-support", {
      recordId: created.id,
      note: `新增測試支援紀錄：${result.projectName || ""}`,
    }).catch(() => {});

    return res.status(201).json(result);
  } catch (err) {
    console.error("❌ 新增測試支援紀錄失敗:", err);
    return res.status(500).json({ message: "新增測試支援紀錄失敗", error: err.message });
  }
});

/* =========================================================
   🛠 管理員更新支援人員 / 狀態
   PATCH /api/test-support/:id
   body: { supporterId?, status? }
========================================================= */
router.patch("/:id", authMiddleware, authorizeRole("admin"), async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Bad id" });

    const { supporterId, status } = req.body || {};
    if (supporterId === undefined && status === undefined) {
      return res.status(400).json({ message: "請至少提供 supporterId 或 status 其中一個欄位" });
    }

    const support = await TestSupport.findByPk(id);
    if (!support) return res.status(404).json({ message: "找不到該筆測試支援紀錄" });

    const updates = {};

    if (supporterId !== undefined) {
      const sid = toInt(supporterId, 0);
      if (!sid) return res.status(400).json({ message: "支援人員（supporterId）格式不正確" });

      const supporter = await User.findByPk(sid, { attributes: ["id"] });
      if (!supporter) return res.status(400).json({ message: "指定的支援人員不存在" });

      updates.supporterId = sid;
    }

    if (status !== undefined) {
      const sNorm = normalizeStatus(status, null);
      if (!sNorm) return res.status(400).json({ message: "狀態不合法（done/doing/pending）" });
      updates.status = sNorm;
    }

    await support.update(updates);

    const withUser = await TestSupport.findByPk(id, {
      include: [
        assocInclude(TestSupport, "supporter", ["id", "username", "name"]),
      ].filter(Boolean),
    });

    const data = withUser.toJSON();

    const result = {
      id: data.id,
      supportDate: data.supportDate,
      requesterDept: data.requesterDept,
      requester: data.requester,
      projectName: data.projectName,
      testType: data.testType,
      relatedNo: data.relatedNo,
      testContent: data.testContent,
      hours: data.hours,
      status: data.status,
      note: data.note,
      supporterId: data.supporterId,
      supporterName: data.supporter?.name || data.supporter?.username || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    logAction(req.user?.id || null, "UPDATE_TEST_SUPPORT", "test-support", {
      recordId: id,
      note: `更新測試支援紀錄：${updates.status ? `status=${updates.status}` : ""}${updates.supporterId ? ` supporterId=${updates.supporterId}` : ""}`.trim(),
    }).catch(() => {});

    return res.json(result);
  } catch (err) {
    console.error("❌ 更新測試支援紀錄失敗:", err);
    return res.status(500).json({ message: "更新測試支援紀錄失敗", error: err.message });
  }
});

export default router;
