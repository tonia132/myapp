// backend/src/routes/equipments.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import { Equipment, EquipmentLoan, User } from "../models/index.js";
import { logAction } from "../utils/logAction.js";

const router = express.Router();

/* =========================================================
   小工具
========================================================= */
const clean = (v) => String(v ?? "").trim();

const toInt = (v, def = 0) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

const clampInt = (v, def, min, max) => {
  const n = toInt(v, def);
  return Math.max(min, Math.min(max, n));
};

const toNonNegInt = (v, def = 0) => {
  const n = toInt(v, def);
  return n < 0 ? 0 : n;
};

const clampStr = (v, max) => {
  const s = clean(v);
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
};

const toBool = (v, def = false) => {
  if (v === true || v === false) return v;
  const s = String(v ?? "").toLowerCase().trim();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off", ""].includes(s)) return false;
  return def;
};

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() ||
    req.ip ||
    ""
  );
}

function parseDateOrNull(v, fieldName = "date") {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    const err = new Error(`${fieldName} is invalid`);
    err.statusCode = 400;
    throw err;
  }
  return d;
}

function replyError(res, err, fallback = "Server error") {
  const code = err?.statusCode || 500;
  const msg = err?.message || fallback;
  return res.status(code).json({ ok: false, message: code === 500 ? fallback : msg });
}

/* =========================================================
   ✅ Admin 權限（優先 JWT role，沒有就查 DB；並做 req 快取）
========================================================= */
const isAdminFromReq = async (req) => {
  if (req._isAdmin !== undefined) return req._isAdmin;

  const r = String(req.user?.role || "").toLowerCase();
  if (r) {
    req._isAdmin = r === "admin";
    return req._isAdmin;
  }

  if (!req.user?.id) {
    req._isAdmin = false;
    return false;
  }

  const me = await User.findByPk(req.user.id, { attributes: ["id", "role"] });
  req._isAdmin = String(me?.role || "").toLowerCase() === "admin";
  return req._isAdmin;
};

const requireAdmin = async (req, res, next) => {
  try {
    if (!(await isAdminFromReq(req))) {
      return res.status(403).json({ ok: false, message: "只有管理員可以操作" });
    }
    next();
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   ✅ open loan qty（pending reserved + borrowed approved）
========================================================= */
async function getOpenLoanQty(equipmentId, transaction) {
  // pending: status=pending & reviewStatus=pending (已先扣庫存)
  // borrowed: status=borrowed & reviewStatus=approved (實際借出)
  const rows = await EquipmentLoan.findAll({
    where: {
      equipmentId,
      [Op.or]: [
        { status: "pending", reviewStatus: "pending" },
        { status: "borrowed", reviewStatus: "approved" },
      ],
    },
    attributes: [
      [EquipmentLoan.sequelize.fn("SUM", EquipmentLoan.sequelize.col("quantity")), "qty"],
    ],
    raw: true,
    transaction,
  });

  const qty = Number(rows?.[0]?.qty || 0) || 0;
  return qty < 0 ? 0 : qty;
}

async function getOpenLoanQtyBreakdown(equipmentId, transaction) {
  const [pending, borrowed] = await Promise.all([
    EquipmentLoan.findAll({
      where: { equipmentId, status: "pending", reviewStatus: "pending" },
      attributes: [[EquipmentLoan.sequelize.fn("SUM", EquipmentLoan.sequelize.col("quantity")), "qty"]],
      raw: true,
      transaction,
    }),
    EquipmentLoan.findAll({
      where: { equipmentId, status: "borrowed", reviewStatus: "approved" },
      attributes: [[EquipmentLoan.sequelize.fn("SUM", EquipmentLoan.sequelize.col("quantity")), "qty"]],
      raw: true,
      transaction,
    }),
  ]);

  const pendingQty = Number(pending?.[0]?.qty || 0) || 0;
  const borrowedQty = Number(borrowed?.[0]?.qty || 0) || 0;
  return {
    pendingQty: pendingQty < 0 ? 0 : pendingQty,
    borrowedQty: borrowedQty < 0 ? 0 : borrowedQty,
    openQty: (pendingQty + borrowedQty) < 0 ? 0 : (pendingQty + borrowedQty),
  };
}

/* =========================================================
   ✅ 取得設備清單
   GET /api/equipments?keyword=&page=&pageSize=&onlyAvailable=
========================================================= */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const page = Math.max(toInt(req.query.page, 1), 1);
    const pageSize = Math.min(Math.max(toInt(req.query.pageSize, 10), 1), 100);
    const keyword = clean(req.query.keyword);
    const onlyAvailable = toBool(req.query.onlyAvailable, false);

    const where = {};
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { assetCode: { [Op.like]: `%${keyword}%` } },
        { location: { [Op.like]: `%${keyword}%` } },
        { keeper: { [Op.like]: `%${keyword}%` } },
      ];
    }
    if (onlyAvailable) {
      where.availableQty = { [Op.gt]: 0 };
    }

    const { rows, count } = await Equipment.findAndCountAll({
      where,
      order: [
        ["name", "ASC"],
        ["id", "ASC"],
      ],
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    const admin = await isAdminFromReq(req);
    const dataRows = rows.map((r) => ({
      ...r.toJSON(),
      canManage: admin,
    }));

    res.json({ ok: true, data: { rows: dataRows, count, page, pageSize } });
  } catch (err) {
    console.error("GET /equipments error:", err);
    res.status(500).json({ ok: false, message: "載入設備清單失敗" });
  }
});

/* =========================================================
   ✅ Admin：借用清單（含 pending/approved/overdue）
   GET /api/equipments/loans?status=&reviewStatus=&kw=&page=&pageSize=&overdue=1
========================================================= */
router.get("/loans", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(toInt(req.query.page, 1), 1);
    const pageSize = Math.min(Math.max(toInt(req.query.pageSize, 20), 1), 100);
    const status = clean(req.query.status);
    const reviewStatus = clean(req.query.reviewStatus);
    const kw = clean(req.query.kw);
    const overdue = String(req.query.overdue || "") === "1";
    const now = new Date();

    const where = {};
    if (status) where.status = status;
    if (reviewStatus) where.reviewStatus = reviewStatus;

    if (overdue) {
      where.status = "borrowed";
      where.reviewStatus = "approved";
      where.expectedReturnAt = { [Op.lt]: now };
    }

    // kw：可查 remark / userId / equipmentId 的相關字串（保守）
    // 若你想更精準，前端可直接傳 equipmentId / userId
    const equipmentId = toInt(req.query.equipmentId, 0);
    const userId = toInt(req.query.userId, 0);
    if (equipmentId) where.equipmentId = equipmentId;
    if (userId) where.userId = userId;

    const include = [
      { model: Equipment, as: "equipment", attributes: ["id", "name", "assetCode"] },
      { model: User, as: "user", attributes: ["id", "username", "name"] },
    ];

    if (kw) {
      // Sequelize 的 include where 會變 inner join；這裡用 OR + `$alias.field$`（需要 raw: false）
      where[Op.or] = [
        { remark: { [Op.like]: `%${kw}%` } },
        { reviewNote: { [Op.like]: `%${kw}%` } },
        { rejectReason: { [Op.like]: `%${kw}%` } },
        { "$equipment.name$": { [Op.like]: `%${kw}%` } },
        { "$equipment.assetCode$": { [Op.like]: `%${kw}%` } },
        { "$user.username$": { [Op.like]: `%${kw}%` } },
        { "$user.name$": { [Op.like]: `%${kw}%` } },
      ];
    }

    const { rows, count } = await EquipmentLoan.findAndCountAll({
      where,
      include,
      order: [["id", "DESC"]],
      offset: (page - 1) * pageSize,
      limit: pageSize,
      distinct: true,
    });

    const dataRows = rows.map((loan) => {
      const plain = loan.toJSON();
      const exp = plain.expectedReturnAt ? new Date(plain.expectedReturnAt) : null;

      let statusOut = plain.status;
      if (plain.reviewStatus === "rejected") statusOut = "rejected";
      else if (plain.reviewStatus === "pending") statusOut = "pending";
      else if (plain.status === "borrowed" && exp && exp < now) statusOut = "overdue";

      return {
        id: plain.id,
        equipmentId: plain.equipmentId,
        equipmentName: plain.equipment?.name || "",
        assetCode: plain.equipment?.assetCode || "",
        userId: plain.userId,
        userName: plain.user?.name || plain.user?.username || "",
        quantity: plain.quantity,
        borrowedAt: plain.borrowedAt,
        expectedReturnAt: plain.expectedReturnAt,
        returnedAt: plain.returnedAt,
        status: statusOut,
        reviewStatus: plain.reviewStatus,
        reviewNote: plain.reviewNote || "",
        rejectReason: plain.rejectReason || "",
        approvedBy: plain.approvedBy || null,
        approvedAt: plain.approvedAt || null,
      };
    });

    res.json({ ok: true, data: { rows: dataRows, count, page, pageSize } });
  } catch (err) {
    console.error("GET /equipments/loans error:", err);
    res.status(500).json({ ok: false, message: "載入借用清單失敗" });
  }
});

/* =========================================================
   ✅ 我的借用紀錄（重點：rejected 一定顯示）
   GET /api/equipments/my-loans
========================================================= */
router.get("/my-loans", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(toInt(req.query.page, 1), 1);
    const pageSize = Math.min(Math.max(toInt(req.query.pageSize, 10), 1), 100);
    const status = clean(req.query.status);
    const where = { userId };
    const now = new Date();

    if (status === "borrowed") {
      where.status = "borrowed";
      where.reviewStatus = "approved";
    } else if (status === "returned") {
      where.status = "returned";
    } else if (status === "pending") {
      where.reviewStatus = "pending";
    } else if (status === "rejected") {
      where.reviewStatus = "rejected";
    } else if (status === "overdue") {
      where.status = "borrowed";
      where.reviewStatus = "approved";
      where.expectedReturnAt = { [Op.lt]: now };
    }

    const { rows, count } = await EquipmentLoan.findAndCountAll({
      where,
      include: [
        {
          model: Equipment,
          as: "equipment",
          attributes: ["id", "name"],
        },
      ],
      order: [["borrowedAt", "DESC"], ["id", "DESC"]],
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    const dataRows = rows.map((loan) => {
      const plain = loan.toJSON();
      const exp = plain.expectedReturnAt ? new Date(plain.expectedReturnAt) : null;

      let statusOut = plain.status;
      if (plain.reviewStatus === "rejected") statusOut = "rejected";
      else if (plain.reviewStatus === "pending") statusOut = "pending";
      else if (statusOut === "borrowed" && exp && exp < now) statusOut = "overdue";

      return {
        id: plain.id,
        equipmentId: plain.equipmentId,
        itemName: plain.equipment?.name || "",
        quantity: plain.quantity,
        borrowedAt: plain.borrowedAt,
        expectedReturnAt: plain.expectedReturnAt,
        returnedAt: plain.returnedAt,
        status: statusOut,
        reviewStatus: plain.reviewStatus,
        rejectReason: plain.rejectReason || "",
        reviewNote: plain.reviewNote || "",
      };
    });

    res.json({ ok: true, data: { rows: dataRows, count, page, pageSize } });
  } catch (err) {
    console.error("GET /equipments/my-loans error:", err);
    res.status(500).json({ ok: false, message: "載入借用紀錄失敗" });
  }
});

/* =========================================================
   ✅ 設備詳情（含 openQty）
   GET /api/equipments/:id
========================================================= */
router.get("/:id(\\d+)", authMiddleware, async (req, res) => {
  const id = toInt(req.params.id, 0);
  try {
    if (!id) return res.status(400).json({ ok: false, message: "invalid id" });

    const eq = await Equipment.findByPk(id);
    if (!eq) return res.status(404).json({ ok: false, message: "設備不存在" });

    // 只做讀取，不鎖
    const bd = await getOpenLoanQtyBreakdown(id);

    const admin = await isAdminFromReq(req);
    res.json({
      ok: true,
      data: {
        ...eq.toJSON(),
        canManage: admin,
        openQty: bd.openQty,
        pendingQty: bd.pendingQty,
        borrowedQty: bd.borrowedQty,
      },
    });
  } catch (err) {
    console.error("GET /equipments/:id error:", err);
    res.status(500).json({ ok: false, message: "載入設備詳情失敗" });
  }
});

/* =========================================================
   ✅ 新增設備（Admin）
   POST /api/equipments
========================================================= */
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const name = clampStr(req.body.name, 120);
    if (!name) return res.status(400).json({ ok: false, message: "名稱為必填" });

    const totalQty = toNonNegInt(req.body.totalQty, 0);
    const hasAvail = req.body.availableQty !== undefined && req.body.availableQty !== null;
    let availableQty = hasAvail ? toNonNegInt(req.body.availableQty, 0) : totalQty;
    if (availableQty > totalQty) availableQty = totalQty;

    const calibrationDate = (() => {
      try { return parseDateOrNull(req.body.calibrationDate, "calibrationDate"); } catch { return null; }
    })();

    const imageUrl = clampStr(req.body.imageUrl, 500) || null;

    const payload = {
      name,
      assetCode: clampStr(req.body.assetCode, 120),
      location: clampStr(req.body.location, 120),
      keeper: clampStr(req.body.keeper, 120),
      totalQty,
      availableQty,
      calibrationDate,
      imageUrl,
      remark: clampStr(req.body.remark, 2000),
      createdBy: req.user.id,
      updatedBy: req.user.id,
    };

    const eq = await Equipment.create(payload);

    logAction(req.user.id, "equipment:create", "equipments", {
      recordId: eq.id,
      meta: { name: eq.name },
    }).catch(() => {});

    res.json({ ok: true, data: eq });
  } catch (err) {
    console.error("POST /equipments error:", err);
    res.status(500).json({ ok: false, message: "新增設備失敗" });
  }
});

/* =========================================================
   ✅ 更新設備（Admin）
   PUT /api/equipments/:id
   - 若改 totalQty/availableQty：會依 open loans 自動校正，避免把已借/已保留「放回」可用
========================================================= */
router.put("/:id(\\d+)", authMiddleware, requireAdmin, async (req, res) => {
  const id = toInt(req.params.id, 0);
  const t = await Equipment.sequelize.transaction();
  try {
    if (!id) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "invalid id" });
    }

    // ✅ 鎖 equipment，避免併發寫壞 availableQty/totalQty
    const eq = await Equipment.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!eq) {
      await t.rollback();
      return res.status(404).json({ ok: false, message: "設備不存在" });
    }

    // 基本文字欄位
    if (req.body.name !== undefined) {
      const nm = clampStr(req.body.name, 120);
      if (nm) eq.name = nm;
    }
    if (req.body.assetCode !== undefined) eq.assetCode = clampStr(req.body.assetCode, 120);
    if (req.body.location !== undefined) eq.location = clampStr(req.body.location, 120);
    if (req.body.keeper !== undefined) eq.keeper = clampStr(req.body.keeper, 120);
    if (req.body.imageUrl !== undefined) eq.imageUrl = clampStr(req.body.imageUrl, 500) || null;
    if (req.body.remark !== undefined) eq.remark = clampStr(req.body.remark, 2000);

    if (req.body.calibrationDate !== undefined) {
      try {
        eq.calibrationDate = parseDateOrNull(req.body.calibrationDate, "calibrationDate");
      } catch {
        eq.calibrationDate = null;
      }
    }

    // 庫存欄位：先算 openQty（pending reserved + borrowed approved）
    const openQty = await getOpenLoanQty(eq.id, t);

    // totalQty 改動：可用數量 = totalQty - openQty（最低 0）
    if (req.body.totalQty !== undefined) {
      const newTotal = toNonNegInt(req.body.totalQty, eq.totalQty);
      eq.totalQty = newTotal;

      const autoAvail = Math.max(0, newTotal - openQty);
      eq.availableQty = autoAvail;
    }

    // availableQty 若明確要求設（但不能超 totalQty，也不能超 totalQty-openQty）
    if (req.body.availableQty !== undefined) {
      const wantAvail = toNonNegInt(req.body.availableQty, eq.availableQty);
      const maxAvail = Math.max(0, eq.totalQty - openQty);
      eq.availableQty = Math.min(wantAvail, maxAvail);
    }

    // 最後防呆
    if (eq.availableQty > eq.totalQty) eq.availableQty = eq.totalQty;
    if (eq.availableQty < 0) eq.availableQty = 0;

    eq.updatedBy = req.user.id;

    await eq.save({ transaction: t });
    await t.commit();

    logAction(req.user.id, "equipment:update", "equipments", {
      recordId: eq.id,
      meta: { name: eq.name },
    }).catch(() => {});

    res.json({ ok: true, data: eq });
  } catch (err) {
    await t.rollback();
    console.error("PUT /equipments/:id error:", err);
    res.status(500).json({ ok: false, message: "更新設備失敗" });
  }
});

/* =========================================================
   ✅ 刪除設備（Admin）
   DELETE /api/equipments/:id
   - 仍有 open loans（pending/borrowed approved）不可刪
========================================================= */
router.delete("/:id(\\d+)", authMiddleware, requireAdmin, async (req, res) => {
  const id = toInt(req.params.id, 0);
  const t = await Equipment.sequelize.transaction();
  try {
    if (!id) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "invalid id" });
    }

    const eq = await Equipment.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!eq) {
      await t.rollback();
      return res.status(404).json({ ok: false, message: "設備不存在" });
    }

    const openQty = await getOpenLoanQty(id, t);
    if (openQty > 0) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "仍有借用中／待審核紀錄，無法刪除" });
    }

    await eq.destroy({ transaction: t });
    await t.commit();

    logAction(req.user.id, "equipment:delete", "equipments", {
      recordId: id,
      meta: { name: eq.name },
    }).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    await t.rollback();
    console.error("DELETE /equipments/:id error:", err);
    res.status(500).json({ ok: false, message: "刪除設備失敗" });
  }
});

/* =========================================================
   ✅ 借用品項（先 pending + 先保留庫存）
   POST /api/equipments/:id/borrow
   - 併發安全：transaction + lock equipment
========================================================= */
router.post("/:id(\\d+)/borrow", authMiddleware, async (req, res) => {
  const equipmentId = toInt(req.params.id, 0);

  const t = await Equipment.sequelize.transaction();
  try {
    if (!equipmentId) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "invalid equipmentId" });
    }

    const qty = toNonNegInt(req.body.quantity, 0);
    const remark = clampStr(req.body.remark, 2000);
    const expectedReturnAt = req.body.expectedReturnAt ? parseDateOrNull(req.body.expectedReturnAt, "expectedReturnAt") : null;

    if (!Number.isInteger(qty) || qty <= 0) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "數量必須為正整數" });
    }

    // ✅ 鎖 equipment，避免兩人同時借用穿透 availableQty
    const eq = await Equipment.findByPk(equipmentId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!eq) {
      await t.rollback();
      return res.status(404).json({ ok: false, message: "設備不存在" });
    }

    if (eq.availableQty < qty) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "可借數量不足" });
    }

    // ✅ pending 也先扣庫存（保留）
    eq.availableQty -= qty;
    if (eq.availableQty < 0) eq.availableQty = 0;
    await eq.save({ transaction: t });

    const loan = await EquipmentLoan.create(
      {
        equipmentId,
        userId: req.user.id,
        quantity: qty,
        expectedReturnAt,
        status: "pending",
        remark,

        reviewStatus: "pending",
        approvedBy: null,
        approvedAt: null,
        reviewNote: null,
        rejectReason: null,
      },
      { transaction: t }
    );

    await t.commit();

    logAction(req.user.id, "equipment:borrow:pending", "equipment_loans", {
      recordId: loan.id,
      meta: { equipmentId, quantity: qty, ip: getClientIp(req) },
    }).catch(() => {});

    res.json({ ok: true, data: loan });
  } catch (err) {
    await t.rollback();
    console.error("POST /equipments/:id/borrow error:", err);
    // parseDateOrNull 會丟 400
    if (err?.statusCode === 400) return replyError(res, err, "借用失敗");
    res.status(500).json({ ok: false, message: "借用失敗" });
  }
});

/* =========================================================
   ✅ 審核借用（Admin）
   POST /api/equipments/loans/:id/review
   body: { decision: "approve" | "reject", reviewNote?, rejectReason? }
   - approve：pending 已先扣庫存，所以不再扣，狀態改 borrowed/approved
   - reject：要回補 pending 時先扣掉的庫存
========================================================= */
router.post("/loans/:id/review", authMiddleware, requireAdmin, async (req, res) => {
  const loanId = toInt(req.params.id, 0);
  const decision = clean(req.body.decision); // approve / reject
  const reviewNote = req.body.reviewNote ?? null;
  const rejectReason = clampStr(req.body.rejectReason, 500);

  if (!loanId) return res.status(400).json({ ok: false, message: "invalid id" });
  if (!["approve", "reject"].includes(decision)) {
    return res.status(400).json({ ok: false, message: "decision 必須為 approve 或 reject" });
  }

  const t = await Equipment.sequelize.transaction();
  try {
    // ✅ 鎖 loan
    const loan = await EquipmentLoan.findByPk(loanId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!loan) {
      await t.rollback();
      return res.status(404).json({ ok: false, message: "借用紀錄不存在" });
    }

    // ✅ 只允許審核 pending
    if (loan.reviewStatus !== "pending" || loan.status !== "pending") {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "此筆已審核或狀態不正確" });
    }

    // ✅ 鎖 equipment
    const eq = await Equipment.findByPk(loan.equipmentId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!eq) {
      await t.rollback();
      return res.status(404).json({ ok: false, message: "設備不存在" });
    }

    if (decision === "approve") {
      loan.reviewStatus = "approved";
      loan.approvedBy = req.user.id;
      loan.approvedAt = new Date();
      loan.reviewNote = reviewNote;
      loan.rejectReason = null;

      loan.status = "borrowed";
      if (!loan.borrowedAt) loan.borrowedAt = new Date();

      await loan.save({ transaction: t });
      await t.commit();

      logAction(req.user.id, "equipment:loan:approve", "equipment_loans", {
        recordId: loan.id,
        meta: { equipmentId: eq.id, quantity: loan.quantity },
      }).catch(() => {});

      return res.json({ ok: true });
    }

    // reject：回補庫存
    loan.reviewStatus = "rejected";
    loan.reviewNote = reviewNote;
    loan.rejectReason = rejectReason || String(reviewNote || "").trim() || "退回";
    loan.approvedBy = req.user.id; // 若你之後有 reviewedBy，可替換
    loan.approvedAt = new Date();  // 若你之後有 reviewedAt，可替換

    loan.status = "rejected";
    await loan.save({ transaction: t });

    eq.availableQty += Number(loan.quantity || 0);
    if (eq.availableQty > eq.totalQty) eq.availableQty = eq.totalQty;
    await eq.save({ transaction: t });

    await t.commit();

    logAction(req.user.id, "equipment:loan:reject", "equipment_loans", {
      recordId: loan.id,
      meta: { equipmentId: eq.id, quantity: loan.quantity, rejectReason: loan.rejectReason },
    }).catch(() => {});

    return res.json({ ok: true });
  } catch (err) {
    await t.rollback();
    console.error("POST /equipments/loans/:id/review error:", err);
    return res.status(500).json({ ok: false, message: "審核失敗" });
  }
});

/* =========================================================
   ✅ 歸還（只有 approved + borrowed 才可）
   POST /api/equipments/loans/:id/return
   - 併發安全：transaction + lock loan + lock equipment
========================================================= */
router.post("/loans/:id/return", authMiddleware, async (req, res) => {
  const loanId = toInt(req.params.id, 0);
  const t = await Equipment.sequelize.transaction();
  try {
    if (!loanId) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "invalid id" });
    }

    // ✅ 鎖 loan
    const loan = await EquipmentLoan.findByPk(loanId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!loan) {
      await t.rollback();
      return res.status(404).json({ ok: false, message: "借用紀錄不存在" });
    }

    const admin = await isAdminFromReq(req);
    if (!admin && Number(loan.userId) !== Number(req.user.id)) {
      await t.rollback();
      return res.status(403).json({ ok: false, message: "無權操作此紀錄" });
    }

    if (loan.status === "returned") {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "此筆已歸還" });
    }

    if (loan.reviewStatus !== "approved" || loan.status !== "borrowed") {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "此筆尚未核准或狀態不正確，無法歸還" });
    }

    // ✅ 鎖 equipment
    const eq = await Equipment.findByPk(loan.equipmentId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!eq) {
      await t.rollback();
      return res.status(404).json({ ok: false, message: "設備不存在" });
    }

    loan.status = "returned";
    loan.returnedAt = new Date();
    await loan.save({ transaction: t });

    eq.availableQty += Number(loan.quantity || 0);
    if (eq.availableQty > eq.totalQty) eq.availableQty = eq.totalQty;
    await eq.save({ transaction: t });

    await t.commit();

    logAction(req.user.id, "equipment:return", "equipment_loans", {
      recordId: loan.id,
      meta: { equipmentId: eq.id },
    }).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    await t.rollback();
    console.error("POST /equipments/loans/:id/return error:", err);
    res.status(500).json({ ok: false, message: "歸還失敗" });
  }
});

export default router;
