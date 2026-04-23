// backend/src/routes/productDraft.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import * as models from "../models/index.js";

const router = express.Router();
const { Product } = models;

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : 0;
};
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const isAdmin = (u) => String(u?.role || "").toLowerCase() === "admin";
const ensureOwnerOrAdmin = (p, u) => isAdmin(u) || Number(p?.createdBy) === Number(u?.id);

/* ===========================
   Draft: GET/PUT
   /api/products/:id/test-plan-draft
=========================== */
router.get("/products/:id/test-plan-draft", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ message: "Bad product id" });

    const p = await Product.unscoped().findByPk(id, {
      attributes: ["id", "createdBy", "isDeleted", "testPlanDraft", "testPlanDraftUpdatedAt", "testPlanDraftUpdatedBy"],
    });
    if (!p || p.isDeleted) return res.status(404).json({ message: "Product not found" });
    if (!ensureOwnerOrAdmin(p, req.user)) return res.status(403).json({ message: "Forbidden" });

    return res.json({
      draft: p.testPlanDraft ?? null,
      updatedAt: p.testPlanDraftUpdatedAt ?? null,
      updatedBy: p.testPlanDraftUpdatedBy ?? null,
    });
  } catch (e) {
    return res.status(500).json({ message: "Failed to load draft" });
  }
});

router.put("/products/:id/test-plan-draft", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ message: "Bad product id" });

    const draft = req.body?.draft;
    if (!(draft === null || isObj(draft))) {
      return res.status(400).json({ message: "draft must be an object or null" });
    }

    const p = await Product.unscoped().findByPk(id, {
      attributes: ["id", "createdBy", "isDeleted", "planLocked"],
    });
    if (!p || p.isDeleted) return res.status(404).json({ message: "Product not found" });
    if (!ensureOwnerOrAdmin(p, req.user)) return res.status(403).json({ message: "Forbidden" });

    // 若 planLocked：非 admin 不允許寫草稿（你要不要這規則可自行移除）
    if (p.planLocked && !isAdmin(req.user)) {
      return res.status(403).json({ message: "Plan is locked (admin only)" });
    }

    await Product.update(
      {
        testPlanDraft: draft,
        testPlanDraftUpdatedBy: req.user?.id || null,
        testPlanDraftUpdatedAt: new Date(),
      },
      { where: { id } }
    );

    const fresh = await Product.unscoped().findByPk(id, { attributes: ["testPlanDraftUpdatedAt"] });
    return res.json({ ok: true, updatedAt: fresh?.testPlanDraftUpdatedAt ?? new Date() });
  } catch (e) {
    return res.status(500).json({ message: "Failed to save draft" });
  }
});

/* ===========================
   ReportMeta: GET/PUT
   /api/products/:id/report-meta
   （DB 是 TEXT：建議前端存 JSON string）
=========================== */
router.get("/products/:id/report-meta", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ message: "Bad product id" });

    const p = await Product.unscoped().findByPk(id, {
      attributes: ["id", "createdBy", "isDeleted", "reportMeta"],
    });
    if (!p || p.isDeleted) return res.status(404).json({ message: "Product not found" });
    if (!ensureOwnerOrAdmin(p, req.user)) return res.status(403).json({ message: "Forbidden" });

    return res.json({ reportMeta: p.reportMeta ?? null });
  } catch {
    return res.status(500).json({ message: "Failed to load reportMeta" });
  }
});

router.put("/products/:id/report-meta", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ message: "Bad product id" });

    const meta = req.body?.reportMeta;
    // TEXT：允許 null 或 string（你要 object 也可改成 JSON.stringify）
    if (!(meta === null || typeof meta === "string")) {
      return res.status(400).json({ message: "reportMeta must be string or null" });
    }

    const p = await Product.unscoped().findByPk(id, {
      attributes: ["id", "createdBy", "isDeleted"],
    });
    if (!p || p.isDeleted) return res.status(404).json({ message: "Product not found" });
    if (!ensureOwnerOrAdmin(p, req.user)) return res.status(403).json({ message: "Forbidden" });

    await Product.update({ reportMeta: meta }, { where: { id } });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ message: "Failed to save reportMeta" });
  }
});

export default router;
