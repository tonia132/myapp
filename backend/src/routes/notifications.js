// backend/src/routes/notifications.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import * as models from "../models/index.js";

const router = express.Router();

/* =========================================================
   ✅ Admin 判斷（優先 JWT role，沒有就查 DB）
========================================================= */
const isAdminFromReq = async (req) => {
  const r = String(req.user?.role || "").toLowerCase();
  if (r) return r === "admin";

  const User = models.User || models.Users;
  if (!User || !req.user?.id) return false;

  const me = await User.findByPk(req.user.id, { attributes: ["id", "role"] }).catch(() => null);
  return String(me?.role || "").toLowerCase() === "admin";
};

const requireAdmin = async (req, res, next) => {
  try {
    if (!(await isAdminFromReq(req))) {
      return res.status(403).json({ message: "Admin only" });
    }
    next();
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   Pending 狀態集合（依你專案常見值）
========================================================= */
const PENDING_SET = ["pending", "review", "waiting", "PENDING", "Pending", "WAITING", "REVIEW"];

/* =========================================================
   ✅ 重要：優先抓「審核狀態欄位」
   避免 model 同時有 status(資源狀態) + reviewStatus(審核狀態)
   造成通知永遠不消失
========================================================= */
function pickStatusField(model) {
  const attrs = model?.rawAttributes || {};

  // ✅ 優先順序：先審核欄位 → 再一般 status
  const candidates = [
    "reviewStatus",
    "review_state",
    "approvalStatus",
    "approval_status",
    "approveStatus",
    "approve_status",
    "auditStatus",
    "audit_status",
    "requestStatus",
    "request_status",
    "loanStatus",
    "loan_status",
    "borrowStatus",
    "borrow_status",
    "state",
    "status",
  ];

  for (const k of candidates) {
    if (attrs[k]) return k;
  }

  // 更泛用：名稱包含 review/approve/status 的欄位
  const keys = Object.keys(attrs);
  const hit = keys.find((k) => /review|approve|approval|audit|status|state/i.test(k));
  return hit || null;
}

function pickTimeField(model) {
  const attrs = model?.rawAttributes || {};
  // 若你的借用/排程是 borrowedAt / createdAt 之類，也能吃到
  const candidates = [
    "createdAt",
    "updatedAt",
    "borrowedAt",
    "requestedAt",
    "created_at",
    "updated_at",
    "borrowed_at",
    "requested_at",
  ];
  return candidates.find((k) => attrs[k]) || "createdAt";
}

/**
 * ✅ Pending 條件：
 * - 若有審核狀態欄位：用 PENDING_SET
 * - 若沒有狀態欄位但有 approvedAt/rejectedAt：兩者皆 null 視為 pending
 * - 若 model 有 isDeleted：一律排除 isDeleted=true
 */
function buildPendingWhere(model) {
  if (!model) return null;
  const attrs = model?.rawAttributes || {};

  const where = {};

  // ✅ 排除軟刪除（你 MachineSchedule / File 都有這種習慣）
  if (attrs.isDeleted) where.isDeleted = false;

  const f = pickStatusField(model);

  // ✅ 特別處理：同時有 reviewStatus + status 的情況（例如 EquipmentLoan）
  //    -> 以 reviewStatus 為主；若 status 也存在且也叫 pending，則一起限制，避免怪資料
  if (f) {
    where[f] = { [Op.in]: PENDING_SET };

    if (f !== "status" && attrs.status) {
      // 只有當「審核欄位」存在且 status 也存在時，額外限制 status 也必須是 pending（可更嚴謹）
      where.status = { [Op.in]: PENDING_SET };
    }

    return where;
  }

  // fallback：時間欄位判斷
  const hasApprovedAt = !!attrs.approvedAt;
  const hasRejectedAt = !!attrs.rejectedAt;
  if (hasApprovedAt && hasRejectedAt) {
    return { ...where, approvedAt: null, rejectedAt: null };
  }

  // fallback：人欄位判斷
  const hasApprovedBy = !!attrs.approvedBy;
  const hasRejectedBy = !!attrs.rejectedBy;
  if (hasApprovedBy && hasRejectedBy) {
    return { ...where, approvedBy: null, rejectedBy: null };
  }

  return null;
}

async function safeCount(model) {
  const where = buildPendingWhere(model);
  if (!where) return 0;
  try {
    return await model.count({ where });
  } catch {
    return 0;
  }
}

async function safeFindAll(model, limit = 30) {
  const where = buildPendingWhere(model);
  if (!where) return [];
  const timeField = pickTimeField(model);
  try {
    return await model.findAll({
      where,
      order: [[timeField, "DESC"]],
      limit,
    });
  } catch {
    return [];
  }
}

/* =========================================================
   你的 models（依你專案常見命名）
========================================================= */
function scheduleModels() {
  return [
    { key: "MachineSchedule", kind: "schedule", titlePrefix: "機台排程待審核" },
    { key: "LabSchedule", kind: "schedule", titlePrefix: "實驗室排程待審核" },
    { key: "Schedule", kind: "schedule", titlePrefix: "排程待審核" },
  ]
    .map((x) => ({ ...x, model: models[x.key] || null }))
    .filter((x) => !!x.model);
}

function borrowModels() {
  return [
    { key: "EquipmentLoan", kind: "borrow", titlePrefix: "租借待審核" },
    { key: "BorrowRecord", kind: "borrow", titlePrefix: "借用待審核" },
  ]
    .map((x) => ({ ...x, model: models[x.key] || null }))
    .filter((x) => !!x.model);
}

/* =========================================================
   GET /api/notifications/summary
   回傳：schedulesPending / borrowsPending / total
========================================================= */
router.get("/summary", authMiddleware, requireAdmin, async (_req, res) => {
  const sModels = scheduleModels();
  const bModels = borrowModels();

  const schedulesPending = (await Promise.all(sModels.map((m) => safeCount(m.model)))).reduce(
    (a, b) => a + b,
    0
  );
  const borrowsPending = (await Promise.all(bModels.map((m) => safeCount(m.model)))).reduce(
    (a, b) => a + b,
    0
  );

  res.json({
    schedulesPending,
    borrowsPending,
    total: schedulesPending + borrowsPending,
  });
});

/* =========================================================
   GET /api/notifications/list?limit=50
   ✅ link 直接導到 /review-center，且帶 source/id 方便定位
========================================================= */
router.get("/list", authMiddleware, requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const perModelLimit = Math.min(limit, 30); // 避免單一 model 拉太多
  const items = [];

  // 排程通知
  for (const m of scheduleModels()) {
    const rows = await safeFindAll(m.model, perModelLimit);
    for (const r of rows) {
      const data = r?.toJSON ? r.toJSON() : r;
      const createdAt = data.createdAt || data.updatedAt || null;

      items.push({
        id: `${m.key}:${data.id}`,
        kind: "schedule",
        source: m.key,
        title: `${m.titlePrefix} #${data.id}`,
        createdAt,
        link: `/review-center?tab=schedule&status=pending&source=${encodeURIComponent(m.key)}&id=${
          data.id
        }`,
        meta: data,
      });
    }
  }

  // 租借通知
  for (const m of borrowModels()) {
    const rows = await safeFindAll(m.model, perModelLimit);
    for (const r of rows) {
      const data = r?.toJSON ? r.toJSON() : r;
      const createdAt = data.createdAt || data.updatedAt || data.borrowedAt || null;

      items.push({
        id: `${m.key}:${data.id}`,
        kind: "borrow",
        source: m.key,
        title: `${m.titlePrefix} #${data.id}`,
        createdAt,
        link: `/review-center?tab=borrow&status=pending&source=${encodeURIComponent(m.key)}&id=${
          data.id
        }`,
        meta: data,
      });
    }
  }

  // 時間新→舊
  items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  res.json({ items: items.slice(0, limit) });
});

export default router;
