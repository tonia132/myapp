// backend/src/routes/testSets.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { Op } from "sequelize";
import { sequelize, DefaultTestSet, DefaultTestSetItem } from "../models/index.js";

const router = express.Router();

const clean = (s) => String(s ?? "").trim();
const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
};
const isAdmin = (u) => String(u?.role || "").toLowerCase() === "admin";
const hasAttr = (model, key) => !!model?.rawAttributes?.[key];

/** ✅ 推斷 DefaultTestSetItem 外鍵欄位名稱（testSetId / defaultTestSetId） */
function inferItemFk() {
  if (!DefaultTestSetItem) return null;
  if (hasAttr(DefaultTestSetItem, "testSetId")) return "testSetId";
  if (hasAttr(DefaultTestSetItem, "defaultTestSetId")) return "defaultTestSetId";
  return null;
}

/** ✅ 組 where：權限條件 AND 搜尋條件（避免 kw 外洩） */
function buildWhere(req) {
  const kw = clean(req.query.kw);
  const and = [];

  // 1) 權限：非 admin 只能 public + 自己
  if (!isAdmin(req.user)) {
    const or = [];
    if (hasAttr(DefaultTestSet, "isPublic")) or.push({ isPublic: true });
    if (hasAttr(DefaultTestSet, "createdBy")) or.push({ createdBy: Number(req.user?.id) });

    // 若 schema 沒有 isPublic/createdBy，退而求其次：只能看全部（或你也可改成全擋）
    if (or.length) and.push({ [Op.or]: or });
  }

  // 2) 搜尋：name/version/templateKey
  if (kw) {
    const like = `%${kw}%`;
    const or = [];
    if (hasAttr(DefaultTestSet, "name")) or.push({ name: { [Op.like]: like } });
    if (hasAttr(DefaultTestSet, "version")) or.push({ version: { [Op.like]: like } });
    if (hasAttr(DefaultTestSet, "templateKey")) or.push({ templateKey: { [Op.like]: like } });

    // 如果一個欄位都沒有，就不要塞搜尋條件避免炸
    if (or.length) and.push({ [Op.or]: or });
  }

  return and.length ? { [Op.and]: and } : {};
}

/** ✅ include items（含排序）：用 separate:true 才能保證 order 生效且不重複父層資料 */
function buildItemsInclude(includeItems) {
  if (!includeItems) return [];
  if (!DefaultTestSetItem) return [];

  return [
    {
      model: DefaultTestSetItem,
      as: "items",
      required: false,
      separate: true,
      order: [
        [hasAttr(DefaultTestSetItem, "orderNo") ? "orderNo" : "id", "ASC"],
        ["id", "ASC"],
      ],
    },
  ];
}

/**
 * ✅ GET /api/test-sets?kw=&includeItems=true&page=&pageSize=
 * 權限：
 * - admin：全部
 * - 一般：public + 自己建立
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const includeItems = String(req.query.includeItems || "").toLowerCase() === "true";
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(200, Math.max(1, toInt(req.query.pageSize, 50)));

    const where = buildWhere(req);

    const { rows, count } = await DefaultTestSet.findAndCountAll({
      where,
      order: [["updatedAt", "DESC"]],
      include: buildItemsInclude(includeItems),
      offset: (page - 1) * pageSize,
      limit: pageSize,
      distinct: true,
    });

    return res.json({ success: true, rows, total: count, page, pageSize });
  } catch (e) {
    console.error("❌ GET /test-sets:", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * ✅ GET /api/test-sets/:id
 */
router.get("/:id(\\d+)", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const includeItems = String(req.query.includeItems || "").toLowerCase() !== "false"; // 預設 true

    const row = await DefaultTestSet.findByPk(id, {
      include: buildItemsInclude(includeItems),
    });

    if (!row) return res.status(404).json({ success: false, message: "not found" });

    // 權限檢查：非 admin 不能看 private 且非自己建立
    if (!isAdmin(req.user)) {
      const pubOk = !hasAttr(DefaultTestSet, "isPublic") ? true : !!row.isPublic;
      const ownerOk = !hasAttr(DefaultTestSet, "createdBy")
        ? false
        : Number(row.createdBy) === Number(req.user?.id);

      if (!pubOk && !ownerOk) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    }

    return res.json({ success: true, data: row });
  } catch (e) {
    console.error("❌ GET /test-sets/:id:", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * ✅ POST /api/test-sets
 * body:
 * {
 *  name, version?, templateKey?, description?, isPublic?,
 *  fromProductId?, items:[{category,section,code,testCase,testProcedure,testCriteria,estHours,isPlanned,orderNo}]
 * }
 *
 * 規則：
 * - isPublic：非 admin 強制 false
 */
router.post("/", authMiddleware, async (req, res) => {
  // ✅ 先驗證，避免一開 transaction 就 early return 沒 rollback
  try {
    const name = clean(req.body?.name);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!name) return res.status(400).json({ success: false, message: "name is required" });
    if (!items.length) return res.status(400).json({ success: false, message: "items is required" });
    if (!DefaultTestSetItem) {
      return res.status(500).json({ success: false, message: "DefaultTestSetItem model not available" });
    }

    const fk = inferItemFk();
    if (!fk) {
      return res.status(500).json({ success: false, message: "DefaultTestSetItem has no FK (testSetId/defaultTestSetId)" });
    }

    const t = await sequelize.transaction();
    try {
      const version = clean(req.body?.version) || null;
      const templateKey = clean(req.body?.templateKey) || null;
      const description = clean(req.body?.description) || null;

      const fromProductId =
        req.body?.fromProductId != null && req.body.fromProductId !== ""
          ? Number(req.body.fromProductId)
          : null;

      let isPublic = !!req.body?.isPublic;
      if (isPublic && !isAdmin(req.user)) isPublic = false;

      // ✅ 只塞 DB 真正有的欄位（避免 schema 不同爆炸）
      const setPayload = {};
      if (hasAttr(DefaultTestSet, "name")) setPayload.name = name;
      if (hasAttr(DefaultTestSet, "version")) setPayload.version = version;
      if (hasAttr(DefaultTestSet, "templateKey")) setPayload.templateKey = templateKey;
      if (hasAttr(DefaultTestSet, "description")) setPayload.description = description;
      if (hasAttr(DefaultTestSet, "isPublic")) setPayload.isPublic = isPublic;
      if (hasAttr(DefaultTestSet, "fromProductId")) setPayload.fromProductId = fromProductId;
      if (hasAttr(DefaultTestSet, "createdBy")) setPayload.createdBy = Number(req.user?.id);

      const created = await DefaultTestSet.create(setPayload, { transaction: t });

      // items payload
      const payload = items
        .map((x, idx) => {
          const code = clean(x?.code);
          if (!code) return null;

          const it = {};
          it[fk] = created.id;

          if (hasAttr(DefaultTestSetItem, "category")) it.category = clean(x?.category) || null;
          if (hasAttr(DefaultTestSetItem, "section")) it.section = clean(x?.section) || null;
          if (hasAttr(DefaultTestSetItem, "code")) it.code = code;

          if (hasAttr(DefaultTestSetItem, "testCase")) it.testCase = clean(x?.testCase) || null;
          if (hasAttr(DefaultTestSetItem, "testProcedure")) it.testProcedure = x?.testProcedure ?? null;
          if (hasAttr(DefaultTestSetItem, "testCriteria")) it.testCriteria = x?.testCriteria ?? null;

          const est = Number(x?.estHours ?? 0);
          if (hasAttr(DefaultTestSetItem, "estHours")) it.estHours = Number.isFinite(est) ? est : 0;

          if (hasAttr(DefaultTestSetItem, "isPlanned")) it.isPlanned = x?.isPlanned !== false;

          const orderNo = Number(x?.orderNo ?? idx + 1);
          if (hasAttr(DefaultTestSetItem, "orderNo")) it.orderNo = Number.isFinite(orderNo) ? orderNo : idx + 1;

          return it;
        })
        .filter(Boolean);

      if (!payload.length) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "no valid items (missing code)" });
      }

      await DefaultTestSetItem.bulkCreate(payload, { transaction: t, validate: true });
      await t.commit();

      const row = await DefaultTestSet.findByPk(created.id, {
        include: buildItemsInclude(true),
      });

      return res.status(201).json({ success: true, data: row });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  } catch (e) {
    console.error("❌ POST /test-sets:", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

export default router;
