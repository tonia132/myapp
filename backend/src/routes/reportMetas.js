import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import * as models from "../models/index.js";

const router = express.Router();
const { Product, ReportMeta } = models;

const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
};
const clean = (v) => String(v ?? "").trim();

function isAdmin(u) {
  return String(u?.role || "").trim().toLowerCase() === "admin";
}
function ensureOwnerOrAdmin(product, user) {
  return isAdmin(user) || Number(user?.id) === Number(product?.createdBy);
}

function defaultFlagsJson() {
  return {
    sections: {
      hw: true,
      perf: true,
      reli: true,
      stab: true,
      pwr: true,
      thrm: true,
      esd: true,
      mep: true,
    },
  };
}
function defaultConfigJson() {
  return {};
}

function normalizeSections(sections) {
  const allow = ["hw", "perf", "reli", "stab", "pwr", "thrm", "esd", "mep"];
  const out = {};
  for (const k of allow) {
    if (sections && Object.prototype.hasOwnProperty.call(sections, k)) {
      out[k] = !!sections[k];
    }
  }
  return out;
}

function normalizeDateOnly(v) {
  const s = clean(v);
  if (!s) return null;
  // 允許 YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // 其它格式（像 2025/12/16）嘗試轉 Date
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * GET /api/report-metas/by-product/:productId
 * - 若不存在：自動建立一筆（findOrCreate）
 */
router.get("/by-product/:productId(\\d+)", authMiddleware, async (req, res) => {
  try {
    const productId = toInt(req.params.productId, 0);
    if (!productId) return res.status(400).json({ success: false, message: "Bad productId" });

    const product = await Product.unscoped().findByPk(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    if (!ensureOwnerOrAdmin(product, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const uid = req.user?.id || null;

    const [row] = await ReportMeta.findOrCreate({
      where: { productId },
      defaults: {
        productId,
        reportName: "Test Report",
        revision: "0.1",
        tplVersion: "v0006",
        flagsJson: defaultFlagsJson(),
        configJson: defaultConfigJson(),
        createdBy: uid,
        updatedBy: uid,

        // ✅ v0006 封面/summary 欄位（預設留空）
        projectName: "",
        reportNo: "",
        revisionName: "R0.1",
        releasedDate: null,
        preparedBy: "",
        approvedBy: "",
        preparedSignatureFileId: null,
        approvedSignatureFileId: null,
        preparedSignatureName: "",
        approvedSignatureName: "",
        summaryRemark: "",
      },
    });

    return res.json({ success: true, data: row });
  } catch (e) {
    console.error("❌ GET /api/report-metas/by-product:", e);
    return res.status(500).json({ success: false, message: "Failed to load report meta" });
  }
});

/**
 * PUT /api/report-metas/by-product/:productId
 * body:
 * {
 *   reportName?, revision?, tplVersion?, flagsJson?, configJson?,
 *   projectName?, reportNo?, revisionName?, releasedDate?,
 *   preparedBy?, approvedBy?,
 *   preparedSignatureFileId?, approvedSignatureFileId?,
 *   preparedSignatureName?, approvedSignatureName?,
 *   summaryRemark?
 * }
 */
router.put("/by-product/:productId(\\d+)", authMiddleware, async (req, res) => {
  try {
    const productId = toInt(req.params.productId, 0);
    if (!productId) return res.status(400).json({ success: false, message: "Bad productId" });

    const product = await Product.unscoped().findByPk(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    if (!ensureOwnerOrAdmin(product, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const uid = req.user?.id || null;

    const patch = {};

    // basic
    if (req.body?.reportName !== undefined) patch.reportName = clean(req.body.reportName) || "Test Report";
    if (req.body?.revision !== undefined) patch.revision = clean(req.body.revision) || "0.1";
    if (req.body?.tplVersion !== undefined) patch.tplVersion = clean(req.body.tplVersion) || "v0006";

    // flagsJson normalize
    if (req.body?.flagsJson !== undefined) {
      const incoming = req.body.flagsJson || {};
      const sections = normalizeSections(incoming?.sections);
      patch.flagsJson = { ...(incoming || {}), sections: { ...sections } };
    }

    // configJson
    if (req.body?.configJson !== undefined) patch.configJson = req.body.configJson ?? {};

    // v0006 cover/summary fields
    if (req.body?.projectName !== undefined) patch.projectName = clean(req.body.projectName);
    if (req.body?.reportNo !== undefined) patch.reportNo = clean(req.body.reportNo);
    if (req.body?.revisionName !== undefined) patch.revisionName = clean(req.body.revisionName);
    if (req.body?.releasedDate !== undefined) patch.releasedDate = normalizeDateOnly(req.body.releasedDate);

    if (req.body?.preparedBy !== undefined) patch.preparedBy = clean(req.body.preparedBy);
    if (req.body?.approvedBy !== undefined) patch.approvedBy = clean(req.body.approvedBy);

    if (req.body?.preparedSignatureFileId !== undefined)
      patch.preparedSignatureFileId = req.body.preparedSignatureFileId ? toInt(req.body.preparedSignatureFileId, 0) : null;

    if (req.body?.approvedSignatureFileId !== undefined)
      patch.approvedSignatureFileId = req.body.approvedSignatureFileId ? toInt(req.body.approvedSignatureFileId, 0) : null;

    if (req.body?.preparedSignatureName !== undefined) patch.preparedSignatureName = clean(req.body.preparedSignatureName);
    if (req.body?.approvedSignatureName !== undefined) patch.approvedSignatureName = clean(req.body.approvedSignatureName);

    if (req.body?.summaryRemark !== undefined) patch.summaryRemark = String(req.body.summaryRemark ?? "");

    patch.updatedBy = uid;

    const existing = await ReportMeta.findOne({ where: { productId } });

    let row;
    if (existing) {
      await ReportMeta.update(patch, { where: { productId } });
      row = await ReportMeta.findOne({ where: { productId } });
    } else {
      row = await ReportMeta.create({
        productId,
        reportName: "Test Report",
        revision: "0.1",
        tplVersion: "v0006",
        flagsJson: defaultFlagsJson(),
        configJson: defaultConfigJson(),
        createdBy: uid,
        updatedBy: uid,

        projectName: "",
        reportNo: "",
        revisionName: "R0.1",
        releasedDate: null,
        preparedBy: "",
        approvedBy: "",
        preparedSignatureFileId: null,
        approvedSignatureFileId: null,
        preparedSignatureName: "",
        approvedSignatureName: "",
        summaryRemark: "",

        ...patch,
      });
    }

    return res.json({ success: true, data: row });
  } catch (e) {
    console.error("❌ PUT /api/report-metas/by-product:", e);
    return res.status(500).json({ success: false, message: "Failed to save report meta" });
  }
});

export default router;
