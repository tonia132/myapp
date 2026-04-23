// backend/src/routes/docManager.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import * as models from "../models/index.js";
import { logAction } from "../utils/logAction.js";

const router = express.Router();
const DocModel = models.DocModel;

const clean = (s) => String(s ?? "").trim();
const lower = (s) => clean(s).toLowerCase();

const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
};

const clamp = (n, min, max) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
};

function hasAttr(model, key) {
  return !!model?.rawAttributes?.[key];
}

/* ---------------- validation ---------------- */
const FAMILY_MAX = 64;
const CODE_MAX = 64;
const REMARK_MAX = 2000;

// 你可以依公司規範調整（目前偏寬鬆、避免中文被擋）
function validateFamily(v) {
  const s = clean(v);
  if (!s) return { ok: false, msg: "modelFamily is required" };
  if (s.length > FAMILY_MAX) return { ok: false, msg: `modelFamily too long (>${FAMILY_MAX})` };
  return { ok: true, val: s };
}

function validateCode(v) {
  const s = clean(v);
  if (!s) return { ok: false, msg: "modelCode is required" };
  if (s.length > CODE_MAX) return { ok: false, msg: `modelCode too long (>${CODE_MAX})` };
  return { ok: true, val: s };
}

function validateProgress(v) {
  const p = clamp(toInt(v, 0), 0, 100);
  return { ok: true, val: p };
}

function sanitizeRemark(v) {
  const s = clean(v);
  if (!s) return null;
  // 去掉控制字元
  const noCtl = s.replace(/[\u0000-\u001f\u007f]/g, "");
  return noCtl.length > REMARK_MAX ? noCtl.slice(0, REMARK_MAX) : noCtl;
}

/* ---------------- etag ---------------- */
function buildEtag(row) {
  // 用 updatedAt + id 做樂觀鎖
  const t = row?.updatedAt ? new Date(row.updatedAt).getTime() : 0;
  return `"doc-${row?.id || 0}-${t}"`;
}

function getClientEtag(req) {
  return String(req.headers["if-match"] || req.body?.meta?.etag || "").trim();
}

/* ---------------- query builders ---------------- */
function buildWhere({ family, kw, familyLike = false }) {
  const where = {};

  const fam = clean(family);
  const keyword = clean(kw);

  if (fam) {
    // 有些人希望 family 可以模糊查：用 familyLike=1 開啟
    where.modelFamily = familyLike ? { [Op.like]: `%${fam}%` } : fam;
  }

  if (keyword) {
    where[Op.or] = [
      { modelCode: { [Op.like]: `%${keyword}%` } },
      { docRemark: { [Op.like]: `%${keyword}%` } },
    ];
  }

  return where;
}

// 避免 order injection：只允許白名單欄位
const ORDER_WHITELIST = new Set(["updatedAt", "createdAt", "modelFamily", "modelCode", "docProgress", "id"]);
function safeOrder(col, dir) {
  const c = String(col || "updatedAt");
  const d = String(dir || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";
  return ORDER_WHITELIST.has(c) ? [c, d] : ["updatedAt", "DESC"];
}

/**
 * GET /api/doc-manager/items
 * query:
 *  - family
 *  - kw (modelCode / docRemark)
 *
 * ✅ 保持相容：回 array（前端直接吃）
 */
router.get("/items", authMiddleware, async (req, res) => {
  try {
    if (!DocModel) return res.json([]);

    const where = buildWhere({
      family: req.query.family,
      kw: req.query.kw,
      familyLike: false,
    });

    const rows = await DocModel.findAll({
      where,
      order: [["updatedAt", "DESC"]],
    });

    res.json(rows);
  } catch (e) {
    console.error("❌ [docManager] GET /items:", e);
    res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * ✅ 新增：分頁版（不破壞舊前端）
 * GET /api/doc-manager/items2?family=&kw=&page=&pageSize=&orderBy=&orderDir=&familyLike=1
 * 回：{ rows, meta }
 */
router.get("/items2", authMiddleware, async (req, res) => {
  try {
    if (!DocModel) return res.json({ rows: [], meta: { count: 0 } });

    const page = clamp(toInt(req.query.page, 1), 1, 100000);
    const pageSize = clamp(toInt(req.query.pageSize, 50), 1, 200);
    const familyLike = String(req.query.familyLike || "") === "1";

    const where = buildWhere({
      family: req.query.family,
      kw: req.query.kw,
      familyLike,
    });

    const [orderBy, orderDir] = safeOrder(req.query.orderBy, req.query.orderDir);

    const { rows, count } = await DocModel.findAndCountAll({
      where,
      order: [[orderBy, orderDir], ["id", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    res.json({
      rows,
      meta: { page, pageSize, count, orderBy, orderDir },
    });
  } catch (e) {
    console.error("❌ [docManager] GET /items2:", e);
    res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * POST /api/doc-manager/items
 * body: { modelFamily, modelCode, docProgress, docRemark }
 */
router.post("/items", authMiddleware, async (req, res) => {
  try {
    if (!DocModel) return res.status(500).json({ success: false, message: "DocModel not found" });

    const vf = validateFamily(req.body.modelFamily);
    const vc = validateCode(req.body.modelCode);
    if (!vf.ok) return res.status(400).json({ success: false, message: vf.msg });
    if (!vc.ok) return res.status(400).json({ success: false, message: vc.msg });

    const { val: docProgress } = validateProgress(req.body.docProgress);
    const docRemark = sanitizeRemark(req.body.docRemark);

    // 先查重，避免直接撞 DB
    const existed = await DocModel.findOne({
      where: { modelFamily: vf.val, modelCode: vc.val },
    });
    if (existed) {
      return res.status(409).json({
        success: false,
        message: "Duplicate: modelFamily + modelCode already exists",
      });
    }

    const created = await DocModel.create({
      modelFamily: vf.val,
      modelCode: vc.val,
      docProgress,
      docRemark,
      ...(hasAttr(DocModel, "createdBy") ? { createdBy: req.user?.id } : {}),
    });

    logAction(req.user?.id, "CREATE", "docManager", {
      recordId: created.id,
      meta: { modelFamily: vf.val, modelCode: vc.val, docProgress },
    }).catch(() => {});

    res.status(201).setHeader("ETag", buildEtag(created)).json(created);
  } catch (e) {
    if (e?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Duplicate: modelFamily + modelCode already exists",
      });
    }
    console.error("❌ [docManager] POST /items:", e);
    res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * ✅ Upsert（同 family+code 存在就更新 progress/remark）
 * POST /api/doc-manager/items/upsert
 * body: { modelFamily, modelCode, docProgress?, docRemark? }
 */
router.post("/items/upsert", authMiddleware, async (req, res) => {
  try {
    if (!DocModel) return res.status(500).json({ success: false, message: "DocModel not found" });

    const vf = validateFamily(req.body.modelFamily);
    const vc = validateCode(req.body.modelCode);
    if (!vf.ok) return res.status(400).json({ success: false, message: vf.msg });
    if (!vc.ok) return res.status(400).json({ success: false, message: vc.msg });

    const docProgress = req.body.docProgress !== undefined ? validateProgress(req.body.docProgress).val : undefined;
    const docRemark = req.body.docRemark !== undefined ? sanitizeRemark(req.body.docRemark) : undefined;

    const row = await DocModel.findOne({
      where: { modelFamily: vf.val, modelCode: vc.val },
    });

    if (!row) {
      const created = await DocModel.create({
        modelFamily: vf.val,
        modelCode: vc.val,
        docProgress: docProgress ?? 0,
        docRemark: docRemark ?? null,
        ...(hasAttr(DocModel, "createdBy") ? { createdBy: req.user?.id } : {}),
      });

      logAction(req.user?.id, "UPSERT_CREATE", "docManager", {
        recordId: created.id,
        meta: { modelFamily: vf.val, modelCode: vc.val },
      }).catch(() => {});

      return res.status(201).setHeader("ETag", buildEtag(created)).json(created);
    }

    if (docProgress !== undefined) row.docProgress = docProgress;
    if (docRemark !== undefined) row.docRemark = docRemark;

    if (hasAttr(DocModel, "updatedBy")) row.updatedBy = req.user?.id;

    await row.save();

    logAction(req.user?.id, "UPSERT_UPDATE", "docManager", {
      recordId: row.id,
      meta: { modelFamily: vf.val, modelCode: vc.val },
    }).catch(() => {});

    res.setHeader("ETag", buildEtag(row)).json(row);
  } catch (e) {
    console.error("❌ [docManager] POST /items/upsert:", e);
    res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * PUT /api/doc-manager/items/:id
 * body: { docProgress, docRemark, meta?: { etag } }
 * header: If-Match: <etag>  (optional, optimistic lock)
 */
router.put("/items/:id", authMiddleware, async (req, res) => {
  try {
    if (!DocModel) return res.status(500).json({ success: false, message: "DocModel not found" });

    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "invalid id" });

    const row = await DocModel.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: "not found" });

    // optimistic lock
    const clientEtag = getClientEtag(req);
    const currentEtag = buildEtag(row);
    if (clientEtag && clientEtag !== currentEtag) {
      return res.status(409).json({
        success: false,
        message: "資料已被更新，請重新載入後再儲存",
        meta: { etag: currentEtag, updatedAt: row.updatedAt },
      });
    }

    const docProgress = clamp(toInt(req.body.docProgress, row.docProgress ?? 0), 0, 100);
    const docRemark = sanitizeRemark(req.body.docRemark);

    row.docProgress = docProgress;
    row.docRemark = docRemark;

    if (hasAttr(DocModel, "updatedBy")) row.updatedBy = req.user?.id;

    await row.save();

    logAction(req.user?.id, "UPDATE", "docManager", {
      recordId: row.id,
      meta: { docProgress },
    }).catch(() => {});

    res.setHeader("ETag", buildEtag(row)).json(row);
  } catch (e) {
    console.error("❌ [docManager] PUT /items/:id:", e);
    res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * ✅ Delete（可選）
 * DELETE /api/doc-manager/items/:id
 */
router.delete("/items/:id", authMiddleware, async (req, res) => {
  try {
    if (!DocModel) return res.status(500).json({ success: false, message: "DocModel not found" });

    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "invalid id" });

    const row = await DocModel.findByPk(id);
    if (!row) return res.json({ success: true });

    await row.destroy();

    logAction(req.user?.id, "DELETE", "docManager", { recordId: id }).catch(() => {});

    res.json({ success: true });
  } catch (e) {
    console.error("❌ [docManager] DELETE /items/:id:", e);
    res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

export default router;
