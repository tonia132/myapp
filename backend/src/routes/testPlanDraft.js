import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import * as models from "../models/index.js";

const router = express.Router();
const { Product } = models;

const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
};

const isAdmin = (u) => String(u?.role || "").toLowerCase() === "admin";

function hasAttr(model, key) {
  return !!model?.rawAttributes?.[key];
}

const isJsonRootOk = (v) =>
  v === null ||
  (v && typeof v === "object"); // object or array 都可（只擋 number/string/bool）

async function getProductOr404(id, attrs) {
  if (!Product) return null;
  return Product.unscoped().findByPk(id, { attributes: attrs });
}

function ensureOwnerOrAdmin(product, user) {
  // 若你不想限制讀取，把這段拿掉即可
  if (isAdmin(user)) return true;
  return Number(user?.id) === Number(product?.createdBy);
}

/**
 * 這支 router 假設你是掛在 /api 之下
 * => GET  /api/products/:id/test-plan-draft
 * => PUT  /api/products/:id/test-plan-draft
 */
router.get("/products/:id/test-plan-draft", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad product id" });

    // 欄位不存在就回 null（避免還沒 migrate 直接炸）
    const attrs = ["id"];
    if (hasAttr(Product, "createdBy")) attrs.push("createdBy");
    if (hasAttr(Product, "testPlanDraft")) attrs.push("testPlanDraft");
    if (hasAttr(Product, "testPlanDraftUpdatedAt")) attrs.push("testPlanDraftUpdatedAt");
    if (hasAttr(Product, "testPlanDraftUpdatedBy")) attrs.push("testPlanDraftUpdatedBy");

    const p = await getProductOr404(id, attrs);
    if (!p) return res.status(404).json({ success: false, message: "Product not found" });

    if (!ensureOwnerOrAdmin(p, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({
      success: true,
      data: {
        draft: hasAttr(Product, "testPlanDraft") ? p.testPlanDraft ?? null : null,
        updatedAt: hasAttr(Product, "testPlanDraftUpdatedAt") ? p.testPlanDraftUpdatedAt ?? null : null,
        updatedBy: hasAttr(Product, "testPlanDraftUpdatedBy") ? p.testPlanDraftUpdatedBy ?? null : null,
      },
    });
  } catch (e) {
    console.error("❌ load test-plan-draft failed:", e);
    return res.status(500).json({ success: false, message: "Failed to load draft" });
  }
});

router.put("/products/:id/test-plan-draft", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad product id" });

    // draft: object/array/null 皆可
    const draft = req.body?.draft;
    if (!isJsonRootOk(draft)) {
      return res.status(400).json({ success: false, message: "draft must be object/array/null" });
    }

    // 欄位不存在直接回 500（表示 schema 還沒準備好）
    if (!hasAttr(Product, "testPlanDraft")) {
      return res.status(500).json({ success: false, message: "Product.testPlanDraft column not found" });
    }

    // 這裡順便抓 planLocked/createdBy 來做權限
    const attrs = ["id"];
    if (hasAttr(Product, "createdBy")) attrs.push("createdBy");
    if (hasAttr(Product, "planLocked")) attrs.push("planLocked");
    if (hasAttr(Product, "isDeleted")) attrs.push("isDeleted");

    const p = await getProductOr404(id, attrs);
    if (!p) return res.status(404).json({ success: false, message: "Product not found" });
    if (hasAttr(Product, "isDeleted") && p.isDeleted) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (!ensureOwnerOrAdmin(p, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // planLocked：只有 admin 能改草稿（跟你其它計畫相關一致）
    if (hasAttr(Product, "planLocked") && p.planLocked && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Plan is locked (admin only)" });
    }

    // 再次用 findByPk 取 instance 以便更新所有 draft 欄位（避免 attributes 限制）
    const row = await Product.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: "Product not found" });

    row.testPlanDraft = draft; // draft=null 表示清空
    if (hasAttr(Product, "testPlanDraftUpdatedBy")) row.testPlanDraftUpdatedBy = req.user?.id || null;
    if (hasAttr(Product, "testPlanDraftUpdatedAt")) row.testPlanDraftUpdatedAt = new Date();
    await row.save();

    return res.json({
      success: true,
      data: {
        ok: true,
        updatedAt: hasAttr(Product, "testPlanDraftUpdatedAt") ? row.testPlanDraftUpdatedAt : new Date(),
      },
    });
  } catch (e) {
    console.error("❌ save test-plan-draft failed:", e);
    return res.status(500).json({ success: false, message: "Failed to save draft" });
  }
});

export default router;
