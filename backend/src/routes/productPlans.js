// backend/src/routes/productPlans.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { Product, TestCase } from "../models/index.js";
import { logAction } from "../utils/logAction.js";
import { recalcProductProgress } from "../utils/productProgress.js";

const router = express.Router();

/* ---------------- helpers ---------------- */

const normRole = (u) => String(u?.role ?? "").trim().toLowerCase();
const isAdmin = (u) => normRole(u) === "admin";

const ensureCanOperate = (reqUser, product) => {
  if (!product) return { ok: false, code: 404, msg: "找不到產品" };

  // ✅ admin 永遠可操作
  if (isAdmin(reqUser)) return { ok: true };

  // ✅ createdBy 用 Number 比較（避免 "1" vs 1）
  if (Number(product.createdBy) === Number(reqUser?.id)) return { ok: true };

  return { ok: false, code: 403, msg: "沒有權限操作該產品" };
};

const ensureCanReplan = (reqUser, product) => {
  if (!product?.planLocked) return { ok: true };
  if (isAdmin(reqUser)) return { ok: true };
  return {
    ok: false,
    code: 409,
    msg: "已 Confirm Plan（planLocked=1），不可 RePlan / 變更 Planning",
  };
};

const normCat = (c) => String(c ?? "").trim().toUpperCase();

// 統一 reset 的欄位
const buildResetPayload = (includePlanned) => {
  const payload = {
    result: "pending",
    workHrs: 0,
    remark: "",
  };
  if (includePlanned) payload.isPlanned = true;
  return payload;
};

/* =========================================================
   Confirm Plan：只鎖定，不清資料
   PUT /api/products/:productId/plan/confirm
========================================================= */
router.put("/:productId/plan/confirm", authMiddleware, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const product = await Product.findByPk(productId);

    const perm = ensureCanOperate(req.user, product);
    if (!perm.ok)
      return res.status(perm.code).json({ success: false, message: perm.msg });

    await product.update({ planLocked: true });

    logAction(req.user.id, "CONFIRM_PLAN", "products", {
      recordId: productId,
      note: "Confirm Plan",
      ip: req.ip,
    }).catch(() => {});

    res.json({ success: true, planLocked: true });
  } catch (err) {
    console.error("❌ confirm plan 失敗:", err);
    res
      .status(500)
      .json({ success: false, message: "伺服器錯誤", error: err.message });
  }
});

/* =========================================================
   Re-Do Plan（整份回到初始）：
   - planLocked=false
   - 全部 isPlanned=true
   - 清 result/workHrs/remark（對齊 Excel 的 TCReplan True）
   PUT /api/products/:productId/plan/redo
========================================================= */
router.put("/:productId/plan/redo", authMiddleware, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const product = await Product.findByPk(productId);

    const perm = ensureCanOperate(req.user, product);
    if (!perm.ok)
      return res.status(perm.code).json({ success: false, message: perm.msg });

    if (product.planLocked && !isAdmin(req.user)) {
      return res.status(409).json({
        success: false,
        message: "已 Confirm Plan，需 admin 才能 Re-Do Plan",
      });
    }

    await product.update({ planLocked: false });

    const [count] = await TestCase.update(buildResetPayload(true), {
      where: { productId, isDeleted: false },
    });

    logAction(req.user.id, "REDO_PLAN", "products", {
      recordId: productId,
      note: `Re-Do Plan (reset ${count} test cases)`,
      ip: req.ip,
    }).catch(() => {});

    await recalcProductProgress(productId).catch(() => {});

    res.json({ success: true, count, planLocked: false });
  } catch (err) {
    console.error("❌ redo plan 失敗:", err);
    res
      .status(500)
      .json({ success: false, message: "伺服器錯誤", error: err.message });
  }
});

/* =========================================================
   Re-Enter（清結果但不動 isPlanned）
   body: { category?: "HW", onlyPlanned?: true/false }
   PUT /api/products/:productId/plan/reenter
========================================================= */
router.put("/:productId/plan/reenter", authMiddleware, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const category = normCat(req.body?.category);
    const onlyPlanned = Boolean(req.body?.onlyPlanned ?? false);

    const product = await Product.findByPk(productId);
    const perm = ensureCanOperate(req.user, product);
    if (!perm.ok)
      return res.status(perm.code).json({ success: false, message: perm.msg });

    const where = { productId, isDeleted: false };
    if (category) where.category = category;
    if (onlyPlanned) where.isPlanned = true;

    const [count] = await TestCase.update(buildResetPayload(false), { where });

    logAction(req.user.id, "REENTER", "products", {
      recordId: productId,
      note: `Re-Enter ${category || "ALL"} (count=${count}, onlyPlanned=${onlyPlanned})`,
      ip: req.ip,
    }).catch(() => {});

    await recalcProductProgress(productId).catch(() => {});

    res.json({ success: true, count });
  } catch (err) {
    console.error("❌ re-enter 失敗:", err);
    res
      .status(500)
      .json({ success: false, message: "伺服器錯誤", error: err.message });
  }
});

/* =========================================================
   Re-Plan（把該分類全部 isPlanned=true + 清結果）
   body: { category: "HW" }
   PUT /api/products/:productId/plan/replan
========================================================= */
router.put("/:productId/plan/replan", authMiddleware, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const category = normCat(req.body?.category);
    if (!category)
      return res.status(400).json({ success: false, message: "缺少 category" });

    const product = await Product.findByPk(productId);
    const perm = ensureCanOperate(req.user, product);
    if (!perm.ok)
      return res.status(perm.code).json({ success: false, message: perm.msg });

    const canReplan = ensureCanReplan(req.user, product);
    if (!canReplan.ok)
      return res
        .status(canReplan.code)
        .json({ success: false, message: canReplan.msg });

    const [count] = await TestCase.update(buildResetPayload(true), {
      where: { productId, category, isDeleted: false },
    });

    logAction(req.user.id, "REPLAN_CATEGORY", "products", {
      recordId: productId,
      note: `Re-Plan ${category} (count=${count})`,
      ip: req.ip,
    }).catch(() => {});

    await recalcProductProgress(productId).catch(() => {});

    res.json({ success: true, count });
  } catch (err) {
    console.error("❌ re-plan 失敗:", err);
    res
      .status(500)
      .json({ success: false, message: "伺服器錯誤", error: err.message });
  }
});

export default router;
