// backend/src/routes/partTestSync.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import * as models from "../models/index.js";

const router = express.Router();
const { Product, TestCase } = models;

/* ---------------- helpers ---------------- */
const clean = (v) => String(v ?? "").trim();
const toBool = (v, def = false) => {
  if (v === true || v === false) return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off", ""].includes(s)) return false;
  return def;
};
function hasAttr(model, key) {
  return !!model?.rawAttributes?.[key];
}
function isAdmin(u) {
  return String(u?.role || "").trim().toLowerCase() === "admin";
}
function ensureOwnerOrAdmin(product, user) {
  return isAdmin(user) || Number(user?.id) === Number(product?.createdBy);
}

/* ---- infer TestCase columns (max compatibility) ---- */
function inferCodeKey() {
  const candidates = ["tcCode", "code", "testCaseCode", "caseCode"];
  for (const k of candidates) if (hasAttr(TestCase, k)) return k;
  return null;
}
function inferTitleKey() {
  const candidates = ["title", "name", "testItem", "item", "testCase"];
  for (const k of candidates) if (hasAttr(TestCase, k)) return k;
  return null;
}
function inferCategoryKey() {
  const candidates = ["category", "group", "section"];
  for (const k of candidates) if (hasAttr(TestCase, k)) return k;
  return null;
}
function inferPlannedKey() {
  const candidates = ["isPlanned", "planned", "selected", "isSelected"];
  for (const k of candidates) if (hasAttr(TestCase, k)) return k;
  return null;
}
function inferHoursKey() {
  const candidates = ["workHrs", "workHours", "manHours", "hours"];
  for (const k of candidates) if (hasAttr(TestCase, k)) return k;
  return null;
}
function inferResultKey() {
  const candidates = ["result", "tcResult", "status"];
  for (const k of candidates) if (hasAttr(TestCase, k)) return k;
  return null;
}
function inferRemarkKey() {
  const candidates = ["remark", "comments", "comment", "note"];
  for (const k of candidates) if (hasAttr(TestCase, k)) return k;
  return null;
}
function inferIsDeletedKey() {
  const candidates = ["isDeleted", "deleted", "is_deleted"];
  for (const k of candidates) if (hasAttr(TestCase, k)) return k;
  return null;
}

router.use(authMiddleware);

/* ------------------------------------------------------------
 * POST /api/products/:id/part-test/sync-cases
 * body:
 *  { sections:[{key,title,enabled,testCases:[{id,code,title,category,isPlanned,workHrs,result,remark}]}],
 *    mode:'upsert'|'replace',
 *    skipExisting:boolean }
 * ---------------------------------------------------------- */
router.post("/products/:id(\\d+)/part-test/sync-cases", async (req, res) => {
  try {
    if (!Product || !TestCase) return res.status(500).json({ success: false, message: "Model missing" });

    const productId = Number(req.params.id || 0);
    if (!productId) return res.status(400).json({ success: false, message: "Bad id" });

    const product = await Product.unscoped().findByPk(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    if (!ensureOwnerOrAdmin(product, req.user)) return res.status(403).json({ success: false, message: "Forbidden" });

    const codeKey = inferCodeKey();
    const titleKey = inferTitleKey();
    const catKey = inferCategoryKey();
    const plannedKey = inferPlannedKey();
    const hoursKey = inferHoursKey();
    const resultKey = inferResultKey();
    const remarkKey = inferRemarkKey();
    const isDeletedKey = inferIsDeletedKey();

    if (!codeKey) return res.status(400).json({ success: false, message: "TestCase has no code column (tcCode/code)" });
    if (!titleKey) return res.status(400).json({ success: false, message: "TestCase has no title column" });
    if (!catKey) return res.status(400).json({ success: false, message: "TestCase has no category/group column" });
    if (!plannedKey) return res.status(400).json({ success: false, message: "TestCase has no planned column (isPlanned)" });

    const mode = clean(req.body?.mode) || "upsert";
    const skipExisting = toBool(req.body?.skipExisting, false);

    const sections = Array.isArray(req.body?.sections) ? req.body.sections : [];
    const incoming = [];
    for (const s of sections) {
      const secKey = clean(s?.key);
      const tcs = Array.isArray(s?.testCases) ? s.testCases : [];
      for (const tc of tcs) {
        const code = clean(tc?.code);
        if (!code) continue;
        incoming.push({
          id: Number(tc?.id || 0) || 0,
          code,
          title: clean(tc?.title),
          category: clean(tc?.category || secKey),
          isPlanned: !!tc?.isPlanned,
          workHrs: Number(tc?.workHrs || 0) || 0,
          result: clean(tc?.result),
          remark: clean(tc?.remark),
        });
      }
    }

    // replace：先刪/軟刪全部
    if (mode === "replace") {
      if (isDeletedKey) {
        await TestCase.update({ [isDeletedKey]: true }, { where: { productId } });
      } else {
        await TestCase.destroy({ where: { productId } });
      }
    }

    // 取現有
    const whereBase = { productId };
    if (isDeletedKey) whereBase[isDeletedKey] = false;

    const existing = await TestCase.unscoped().findAll({
      where: whereBase,
      attributes: ["id", codeKey],
      raw: true,
    });

    const map = new Map();
    for (const r of existing) {
      const c = clean(r[codeKey]);
      if (c) map.set(c, Number(r.id));
    }

    const touched = [];
    let created = 0, updated = 0, skipped = 0;

    for (const tc of incoming) {
      const existId = map.get(tc.code) || 0;

      if (existId && skipExisting) {
        skipped++;
        touched.push({ id: existId, code: tc.code });
        continue;
      }

      const patch = {
        productId,
        [codeKey]: tc.code,
        [titleKey]: tc.title || tc.code,
        [catKey]: tc.category || "SEC",
        [plannedKey]: tc.isPlanned,
      };

      if (hoursKey) patch[hoursKey] = tc.workHrs;
      if (resultKey) patch[resultKey] = tc.result || "";
      if (remarkKey) patch[remarkKey] = tc.remark || "";

      if (existId) {
        await TestCase.update(patch, { where: { id: existId } });
        updated++;
        touched.push({ id: existId, code: tc.code });
      } else {
        const row = await TestCase.create(patch);
        created++;
        touched.push({ id: row.id, code: tc.code });
        map.set(tc.code, row.id);
      }
    }

    return res.json({
      success: true,
      message: "Synced",
      created,
      updated,
      skipped,
      rows: touched,
    });
  } catch (e) {
    console.error("❌ POST /products/:id/part-test/sync-cases:", e);
    return res.status(500).json({ success: false, message: "Failed to sync cases" });
  }
});

export default router;
