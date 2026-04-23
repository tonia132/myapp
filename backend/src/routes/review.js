// backend/src/routes/review.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import { logAction } from "../utils/logAction.js";
import * as models from "../models/index.js";

const router = express.Router();

/* ---------------- helpers ---------------- */
const clean = (v) => String(v ?? "").trim();
const toInt = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
};

function requireReviewer(req, res, next) {
  const role = String(req.user?.role || "").toLowerCase();
  if (!["admin", "supervisor"].includes(role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

// LabSchedule: date(YYYY-MM-DD) + time(HH:mm[:ss]) -> Date (local time)
function combineDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const t = String(timeStr).trim();
  const hhmmss = t.length === 5 ? `${t}:00` : t;
  return new Date(`${dateStr}T${hhmmss}`);
}

/** ✅ 安全 include：只有 association 存在才 include */
function assocInclude(model, alias, attributes, extra = {}) {
  if (!model?.associations || !model.associations[alias]) return null;
  return { association: alias, attributes, required: false, ...extra };
}

/** ✅ Model 欄位判斷（避免某些表沒欄位就炸） */
function modelHasAttr(Model, key) {
  return !!Model?.rawAttributes?.[key];
}
function rowHasAttr(row, key) {
  return !!row?.constructor?.rawAttributes?.[key];
}
function setIfRowHas(row, key, value) {
  if (rowHasAttr(row, key)) row[key] = value;
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  throw err;
}

function pickStatusField(Model, candidates) {
  for (const k of candidates) {
    if (modelHasAttr(Model, k)) return k;
  }
  // fallback：真的都沒有就回第一個（避免 undefined key）
  return candidates?.[0] || "status";
}

function addSoftDeleteWhere(Model, where) {
  if (modelHasAttr(Model, "isDeleted")) where.isDeleted = false;
  if (modelHasAttr(Model, "deletedAt")) where.deletedAt = null;
  return where;
}

function buildKeywordWhere(cfg, keywordRaw) {
  const kw = clean(keywordRaw);
  if (!kw) return null;
  const like = `%${kw}%`;

  const ors = [];

  // main model fields
  for (const f of cfg.keywordFields || []) {
    if (modelHasAttr(cfg.model, f)) {
      ors.push({ [f]: { [Op.like]: like } });
    }
  }

  // association fields (Sequelize $alias.field$)
  for (const x of cfg.keywordAssocFields || []) {
    const aliasOk = !!cfg.model?.associations?.[x.alias];
    if (!aliasOk) continue;
    // 這裡不強制檢查 target model 是否有欄位（有時候 include attributes 會擋），先放寬
    ors.push({ [`$${x.alias}.${x.field}$`]: { [Op.like]: like } });
  }

  return ors.length ? { [Op.or]: ors } : null;
}

/* ---------------- models ---------------- */
const {
  User,
  Machine,
  MachineSchedule,
  LabSchedule,
  Equipment,
  EquipmentLoan,
  WarehouseItem,
  BorrowRecord,
  WarehouseBorrow, // 可能有（warehouse_borrows）
} = models;

// ✅ 倉庫借用：優先 WarehouseBorrow，沒有就退回 BorrowRecord
const WarehouseBorrowModel = WarehouseBorrow || BorrowRecord;

/* =========================================================
   TYPE CONFIG
========================================================= */
const TYPE_CFG = {
  /* ---------------- Machine Schedule ---------------- */
  machine: {
    model: MachineSchedule,
    statusCandidates: ["reviewStatus", "status", "state"],
    include: [
      assocInclude(MachineSchedule, "machine", ["id", "name"]),
      assocInclude(MachineSchedule, "creator", ["id", "name", "role"]),
      assocInclude(MachineSchedule, "user", ["id", "name", "role"]),
      assocInclude(MachineSchedule, "approver", ["id", "name", "role"]),
    ].filter(Boolean),
    whereBase: () => ({}),
    keywordFields: ["testName", "scheduleName", "userName", "operator", "reviewNote", "rejectReason"],
    keywordAssocFields: [
      { alias: "machine", field: "name" },
      { alias: "creator", field: "name" },
      { alias: "creator", field: "username" },
      { alias: "user", field: "name" },
      { alias: "user", field: "username" },
      { alias: "approver", field: "name" },
      { alias: "approver", field: "username" },
    ],
    map: (r, statusField) => ({
      id: r.id,
      type: "machine",
      resourceName: r.machine?.name || "",
      requesterName: r.creator?.name || r.user?.name || r.userName || r.operator || "",
      startAt: r.startTime,
      endAt: r.endTime,
      purpose: r.testName || r.scheduleName || "",
      status: r[statusField],
      createdAt: r.createdAt,
      reviewNote: r.reviewNote || "",
      rejectReason: r.rejectReason || "",
    }),
    approve: async (row, reviewerId, note) => {
      // status
      setIfRowHas(row, "reviewStatus", "approved");
      setIfRowHas(row, "status", rowHasAttr(row, "reviewStatus") ? row.status : "approved"); // 若無 reviewStatus 才動 status
      setIfRowHas(row, "state", "approved");

      // note/reason
      setIfRowHas(row, "reviewNote", note || null);
      setIfRowHas(row, "rejectReason", null);

      // approver meta
      setIfRowHas(row, "approvedBy", reviewerId);
      setIfRowHas(row, "approvedAt", new Date());

      await row.save();
    },
    reject: async (row, reviewerId, reason) => {
      setIfRowHas(row, "reviewStatus", "rejected");
      setIfRowHas(row, "status", rowHasAttr(row, "reviewStatus") ? row.status : "rejected");
      setIfRowHas(row, "state", "rejected");

      setIfRowHas(row, "rejectReason", reason || null);
      setIfRowHas(row, "reviewNote", null);

      setIfRowHas(row, "approvedBy", reviewerId);
      setIfRowHas(row, "approvedAt", new Date());

      await row.save();
    },
  },

  /* ---------------- Lab Schedules ---------------- */
  emcsi: {
    model: LabSchedule,
    statusCandidates: ["status", "reviewStatus", "state"],
    include: [assocInclude(LabSchedule, "requester", ["id", "name", "role", "username"])].filter(Boolean),
    whereBase: () => ({ labType: "EMCSI" }),
    keywordFields: ["purpose", "adminRemark", "remark"],
    keywordAssocFields: [{ alias: "requester", field: "name" }, { alias: "requester", field: "username" }],
    map: (r, statusField) => ({
      id: r.id,
      type: "emcsi",
      resourceName: "EMC/SI",
      requesterName: r.requester?.name || "",
      startAt: combineDateTime(r.date, r.startTime),
      endAt: combineDateTime(r.date, r.endTime),
      purpose: r.purpose || "",
      status: r[statusField],
      createdAt: r.createdAt,
      reviewNote: r.adminRemark || "",
      rejectReason: String(r[statusField]) === "rejected" ? r.adminRemark || "" : "",
    }),
    approve: async (row, reviewerId, note) => {
      setIfRowHas(row, "status", "approved");
      setIfRowHas(row, "reviewStatus", "approved");
      setIfRowHas(row, "state", "approved");

      setIfRowHas(row, "adminRemark", note || null);
      setIfRowHas(row, "approvedBy", reviewerId);
      setIfRowHas(row, "approvedAt", new Date());

      await row.save();
    },
    reject: async (row, reviewerId, reason) => {
      setIfRowHas(row, "status", "rejected");
      setIfRowHas(row, "reviewStatus", "rejected");
      setIfRowHas(row, "state", "rejected");

      setIfRowHas(row, "adminRemark", reason || null);
      setIfRowHas(row, "approvedBy", reviewerId);
      setIfRowHas(row, "approvedAt", new Date());

      await row.save();
    },
  },

  ip: {
    model: LabSchedule,
    statusCandidates: ["status", "reviewStatus", "state"],
    include: [assocInclude(LabSchedule, "requester", ["id", "name", "role", "username"])].filter(Boolean),
    whereBase: () => ({ labType: "IP" }),
    keywordFields: ["purpose", "adminRemark", "remark"],
    keywordAssocFields: [{ alias: "requester", field: "name" }, { alias: "requester", field: "username" }],
    map: (r, statusField) => ({
      id: r.id,
      type: "ip",
      resourceName: "IP",
      requesterName: r.requester?.name || "",
      startAt: combineDateTime(r.date, r.startTime),
      endAt: combineDateTime(r.date, r.endTime),
      purpose: r.purpose || "",
      status: r[statusField],
      createdAt: r.createdAt,
      reviewNote: r.adminRemark || "",
      rejectReason: String(r[statusField]) === "rejected" ? r.adminRemark || "" : "",
    }),
    approve: async (row, reviewerId, note) => {
      setIfRowHas(row, "status", "approved");
      setIfRowHas(row, "reviewStatus", "approved");
      setIfRowHas(row, "state", "approved");

      setIfRowHas(row, "adminRemark", note || null);
      setIfRowHas(row, "approvedBy", reviewerId);
      setIfRowHas(row, "approvedAt", new Date());

      await row.save();
    },
    reject: async (row, reviewerId, reason) => {
      setIfRowHas(row, "status", "rejected");
      setIfRowHas(row, "reviewStatus", "rejected");
      setIfRowHas(row, "state", "rejected");

      setIfRowHas(row, "adminRemark", reason || null);
      setIfRowHas(row, "approvedBy", reviewerId);
      setIfRowHas(row, "approvedAt", new Date());

      await row.save();
    },
  },

  ik: {
    model: LabSchedule,
    statusCandidates: ["status", "reviewStatus", "state"],
    include: [assocInclude(LabSchedule, "requester", ["id", "name", "role", "username"])].filter(Boolean),
    whereBase: () => ({ labType: "IK" }),
    keywordFields: ["purpose", "adminRemark", "remark"],
    keywordAssocFields: [{ alias: "requester", field: "name" }, { alias: "requester", field: "username" }],
    map: (r, statusField) => ({
      id: r.id,
      type: "ik",
      resourceName: "IK",
      requesterName: r.requester?.name || "",
      startAt: combineDateTime(r.date, r.startTime),
      endAt: combineDateTime(r.date, r.endTime),
      purpose: r.purpose || "",
      status: r[statusField],
      createdAt: r.createdAt,
      reviewNote: r.adminRemark || "",
      rejectReason: String(r[statusField]) === "rejected" ? r.adminRemark || "" : "",
    }),
    approve: async (row, reviewerId, note) => {
      setIfRowHas(row, "status", "approved");
      setIfRowHas(row, "reviewStatus", "approved");
      setIfRowHas(row, "state", "approved");

      setIfRowHas(row, "adminRemark", note || null);
      setIfRowHas(row, "approvedBy", reviewerId);
      setIfRowHas(row, "approvedAt", new Date());

      await row.save();
    },
    reject: async (row, reviewerId, reason) => {
      setIfRowHas(row, "status", "rejected");
      setIfRowHas(row, "reviewStatus", "rejected");
      setIfRowHas(row, "state", "rejected");

      setIfRowHas(row, "adminRemark", reason || null);
      setIfRowHas(row, "approvedBy", reviewerId);
      setIfRowHas(row, "approvedAt", new Date());

      await row.save();
    },
  },

  ems: {
    model: LabSchedule,
    statusCandidates: ["status", "reviewStatus", "state"],
    include: [assocInclude(LabSchedule, "requester", ["id", "name", "role", "username"])].filter(Boolean),
    whereBase: () => ({ labType: "EMS" }),
    keywordFields: ["purpose", "adminRemark", "remark"],
    keywordAssocFields: [{ alias: "requester", field: "name" }, { alias: "requester", field: "username" }],
    map: (r, statusField) => ({
      id: r.id,
      type: "ems",
      resourceName: "EMS",
      requesterName: r.requester?.name || "",
      startAt: combineDateTime(r.date, r.startTime),
      endAt: combineDateTime(r.date, r.endTime),
      purpose: r.purpose || "",
      status: r[statusField],
      createdAt: r.createdAt,
      reviewNote: r.adminRemark || "",
      rejectReason: String(r[statusField]) === "rejected" ? r.adminRemark || "" : "",
    }),
    approve: async (row, reviewerId, note) => {
      setIfRowHas(row, "status", "approved");
      setIfRowHas(row, "reviewStatus", "approved");
      setIfRowHas(row, "state", "approved");

      setIfRowHas(row, "adminRemark", note || null);
      setIfRowHas(row, "approvedBy", reviewerId);
      setIfRowHas(row, "approvedAt", new Date());

      await row.save();
    },
    reject: async (row, reviewerId, reason) => {
      setIfRowHas(row, "status", "rejected");
      setIfRowHas(row, "reviewStatus", "rejected");
      setIfRowHas(row, "state", "rejected");

      setIfRowHas(row, "adminRemark", reason || null);
      setIfRowHas(row, "approvedBy", reviewerId);
      setIfRowHas(row, "approvedAt", new Date());

      await row.save();
    },
  },

  /* ---------------- Equipment Loan ---------------- */
  equipment: {
    model: EquipmentLoan,
    statusCandidates: ["reviewStatus", "status", "state"],
    include: [
      assocInclude(EquipmentLoan, "equipment", ["id", "name"]),
      assocInclude(EquipmentLoan, "user", ["id", "name", "role", "username"]),
      assocInclude(EquipmentLoan, "approver", ["id", "name", "role", "username"]),
    ].filter(Boolean),
    whereBase: () => ({}),
    keywordFields: ["remark", "reviewNote", "rejectReason"],
    keywordAssocFields: [
      { alias: "equipment", field: "name" },
      { alias: "user", field: "name" },
      { alias: "user", field: "username" },
    ],
    map: (r, statusField) => ({
      id: r.id,
      type: "equipment",
      resourceName: r.equipment?.name || "",
      requesterName: r.user?.name || "",
      startAt: r.borrowedAt,
      endAt: r.expectedReturnAt,
      purpose: r.remark || "",
      status: r[statusField],
      createdAt: r.createdAt,
      reviewNote: r.reviewNote || "",
      rejectReason: r.rejectReason || "",
    }),

    // ✅ 核准：pending(已先扣庫存) -> approved + status=borrowed
    approve: async (row, reviewerId, note) => {
      const sequelize = EquipmentLoan?.sequelize || models.sequelize;
      const t = await sequelize.transaction();
      try {
        const loan = await EquipmentLoan.findByPk(row.id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!loan) badRequest("Not found");

        // 僅允許處理 pending
        const rs = rowHasAttr(loan, "reviewStatus") ? String(loan.reviewStatus) : String(loan.status);
        const st = rowHasAttr(loan, "status") ? String(loan.status) : rs;

        if (rs !== "pending" || st !== "pending") {
          badRequest("Only pending can be approved");
        }

        setIfRowHas(loan, "reviewStatus", "approved");
        setIfRowHas(loan, "reviewNote", note || null);
        setIfRowHas(loan, "rejectReason", null);
        setIfRowHas(loan, "approvedBy", reviewerId);
        setIfRowHas(loan, "approvedAt", new Date());

        // ✅ 同步 status
        setIfRowHas(loan, "status", "borrowed");
        if (rowHasAttr(loan, "borrowedAt") && !loan.borrowedAt) loan.borrowedAt = new Date();

        await loan.save({ transaction: t });
        await t.commit();
      } catch (e) {
        await t.rollback();
        throw e;
      }
    },

    // ✅ 退回：pending(已先扣庫存) -> rejected + 回補 availableQty
    reject: async (row, reviewerId, reason) => {
      const sequelize = EquipmentLoan?.sequelize || models.sequelize;
      const t = await sequelize.transaction();
      try {
        const loan = await EquipmentLoan.findByPk(row.id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!loan) badRequest("Not found");

        const rs = rowHasAttr(loan, "reviewStatus") ? String(loan.reviewStatus) : String(loan.status);
        const st = rowHasAttr(loan, "status") ? String(loan.status) : rs;

        if (rs !== "pending" || st !== "pending") {
          badRequest("Only pending can be rejected");
        }

        const eq = await Equipment.findByPk(loan.equipmentId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!eq) badRequest("Equipment not found");

        setIfRowHas(loan, "reviewStatus", "rejected");
        setIfRowHas(loan, "rejectReason", reason || null);
        setIfRowHas(loan, "reviewNote", null);
        setIfRowHas(loan, "approvedBy", reviewerId);
        setIfRowHas(loan, "approvedAt", new Date());

        // ✅ 同步 status，避免被當 pending 佔用
        setIfRowHas(loan, "status", "rejected");

        await loan.save({ transaction: t });

        // ✅ 回補庫存（因為 pending 時已先扣）
        const add = Number(loan.quantity || 0);
        const cur = Number(eq.availableQty || 0);
        const total = Number(eq.totalQty || 0);
        eq.availableQty = Math.min(total, cur + add);

        await eq.save({ transaction: t });
        await t.commit();
      } catch (e) {
        await t.rollback();
        throw e;
      }
    },
  },

  /* ---------------- Warehouse Borrow ---------------- */
  warehouse: {
    model: WarehouseBorrowModel,
    statusCandidates: ["reviewStatus", "status", "state"],
    include: (() => {
      if (WarehouseBorrowModel === WarehouseBorrow) {
        return [
          assocInclude(WarehouseBorrowModel, "item", ["id", "name", "code"]),
          assocInclude(WarehouseBorrowModel, "user", ["id", "name", "role", "username"]),
          assocInclude(WarehouseBorrowModel, "approver", ["id", "name", "role", "username"]),
        ].filter(Boolean);
      }
      // BorrowRecord fallback
      return [
        assocInclude(BorrowRecord, "item", ["id", "name", "code"]),
        assocInclude(BorrowRecord, "borrower", ["id", "name", "role", "username"]),
        assocInclude(BorrowRecord, "approver", ["id", "name", "role", "username"]),
      ].filter(Boolean);
    })(),
    whereBase: () => ({}),
    keywordFields: ["purpose", "remark", "reviewNote", "rejectReason"],
    keywordAssocFields:
      WarehouseBorrowModel === WarehouseBorrow
        ? [
            { alias: "item", field: "name" },
            { alias: "item", field: "code" },
            { alias: "user", field: "name" },
            { alias: "user", field: "username" },
          ]
        : [
            { alias: "item", field: "name" },
            { alias: "item", field: "code" },
            { alias: "borrower", field: "name" },
            { alias: "borrower", field: "username" },
          ],
    map: (r, statusField) => {
      const requesterName =
        WarehouseBorrowModel === WarehouseBorrow ? r.user?.name || "" : r.borrower?.name || "";

      return {
        id: r.id,
        type: "warehouse",
        resourceName: r.item?.name || r.item?.code || "",
        requesterName,
        startAt: r.borrowedAt,
        endAt: r.expectedReturnAt,
        purpose: r.purpose || r.remark || "",
        status: r[statusField],
        createdAt: r.createdAt,
        reviewNote: r.reviewNote || "",
        rejectReason: r.rejectReason || "",
      };
    },
    approve: async (row, reviewerId, note) => {
      setIfRowHas(row, "reviewStatus", "approved");
      setIfRowHas(row, "status", rowHasAttr(row, "reviewStatus") ? row.status : "approved");
      setIfRowHas(row, "state", "approved");

      setIfRowHas(row, "reviewNote", note || null);
      setIfRowHas(row, "rejectReason", null);
      setIfRowHas(row, "approvedBy", reviewerId);
      setIfRowHas(row, "approvedAt", new Date());
      await row.save();
    },
    reject: async (row, reviewerId, reason) => {
      setIfRowHas(row, "reviewStatus", "rejected");
      setIfRowHas(row, "status", rowHasAttr(row, "reviewStatus") ? row.status : "rejected");
      setIfRowHas(row, "state", "rejected");

      setIfRowHas(row, "rejectReason", reason || null);
      setIfRowHas(row, "reviewNote", null);
      setIfRowHas(row, "approvedBy", reviewerId);
      setIfRowHas(row, "approvedAt", new Date());
      await row.save();
    },
  },
};

function getCfg(type) {
  const cfg = TYPE_CFG[type];
  if (!cfg) {
    const allow = Object.keys(TYPE_CFG).join(", ");
    const err = new Error(`Unknown type: ${type}. allowed: ${allow}`);
    err.status = 400;
    throw err;
  }
  if (!cfg.model) {
    const err = new Error(`Model for type "${type}" is not available in models/index.js`);
    err.status = 500;
    throw err;
  }
  return cfg;
}

function getStatusField(cfg) {
  return pickStatusField(cfg.model, cfg.statusCandidates || ["reviewStatus", "status"]);
}

/* =========================================================
   GET /api/review/requests?type=machine&status=pending&keyword=&page=1&pageSize=20
========================================================= */
router.get("/requests", authMiddleware, requireReviewer, async (req, res) => {
  try {
    const type = clean(req.query.type) || "machine";
    const status = clean(req.query.status);
    const keyword = clean(req.query.keyword);
    const page = toInt(req.query.page, 1);
    const pageSize = Math.min(200, toInt(req.query.pageSize, 20));

    const cfg = getCfg(type);
    const statusField = getStatusField(cfg);

    // base where
    const where = addSoftDeleteWhere(cfg.model, { ...cfg.whereBase() });

    if (status) where[statusField] = status;

    const kwWhere = buildKeywordWhere(cfg, keyword);
    if (kwWhere) Object.assign(where, kwWhere);

    const { rows, count } = await cfg.model.findAndCountAll({
      where,
      include: cfg.include,
      order: [["createdAt", "DESC"]],
      offset: (page - 1) * pageSize,
      limit: pageSize,
      distinct: true,
    });

    const mapped = rows.map((r) => cfg.map(r, statusField));

    res.json({
      rows: mapped,
      count: typeof count === "number" ? count : (count?.length || mapped.length),
      page,
      pageSize,
      statusField,
    });
  } catch (err) {
    console.error("❌ GET /api/review/requests error:", err);
    res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

/* =========================================================
   GET /api/review/summary?type=machine
========================================================= */
router.get("/summary", authMiddleware, requireReviewer, async (req, res) => {
  try {
    const type = clean(req.query.type) || "machine";
    const cfg = getCfg(type);
    const field = getStatusField(cfg);

    const base = addSoftDeleteWhere(cfg.model, { ...cfg.whereBase() });

    const [pending, approved, rejected] = await Promise.all([
      cfg.model.count({ where: { ...base, [field]: "pending" } }),
      cfg.model.count({ where: { ...base, [field]: "approved" } }),
      cfg.model.count({ where: { ...base, [field]: "rejected" } }),
    ]);

    res.json({ pending, approved, rejected, statusField: field });
  } catch (err) {
    console.error("❌ GET /api/review/summary error:", err);
    res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

/* =========================================================
   POST /api/review/requests/:type/:id/approve { note }
========================================================= */
router.post("/requests/:type/:id/approve", authMiddleware, requireReviewer, async (req, res) => {
  try {
    const type = clean(req.params.type);
    const id = Number(req.params.id);
    const note = clean(req.body?.note);

    const cfg = getCfg(type);
    const statusField = getStatusField(cfg);

    const row = await cfg.model.findByPk(id);
    if (!row) return res.status(404).json({ message: "Not found" });

    if (String(row[statusField]) !== "pending") {
      return res.status(400).json({ message: "Only pending can be approved" });
    }

    await cfg.approve(row, req.user?.id || null, note);

    await logAction(req.user?.id, `APPROVE_${type.toUpperCase()}`, "review", {
      recordId: id,
      note: note || "approved",
      status: "approved",
      meta: { type },
      ip: req.ip,
    }).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ POST /api/review/approve error:", err);
    res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

/* =========================================================
   POST /api/review/requests/:type/:id/reject { reason }
========================================================= */
router.post("/requests/:type/:id/reject", authMiddleware, requireReviewer, async (req, res) => {
  try {
    const type = clean(req.params.type);
    const id = Number(req.params.id);
    const reason = clean(req.body?.reason);

    if (!reason) return res.status(400).json({ message: "Reject reason required" });

    const cfg = getCfg(type);
    const statusField = getStatusField(cfg);

    const row = await cfg.model.findByPk(id);
    if (!row) return res.status(404).json({ message: "Not found" });

    if (String(row[statusField]) !== "pending") {
      return res.status(400).json({ message: "Only pending can be rejected" });
    }

    await cfg.reject(row, req.user?.id || null, reason);

    await logAction(req.user?.id, `REJECT_${type.toUpperCase()}`, "review", {
      recordId: id,
      note: reason,
      status: "rejected",
      meta: { type },
      ip: req.ip,
    }).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ POST /api/review/reject error:", err);
    res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

export default router;
