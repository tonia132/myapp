// backend/src/routes/reportMeta.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import * as models from "../models/index.js";

const router = express.Router();
const { Product, ReportMeta } = models;

/* ---------------- helpers ---------------- */
const clean = (v) => String(v ?? "").trim();

const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
};

function isAdmin(u) {
  return String(u?.role || "").trim().toLowerCase() === "admin";
}

function ensureOwnerOrAdmin(product, user) {
  return isAdmin(user) || Number(user?.id) === Number(product?.createdBy);
}

function tryParseJson(v) {
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (!s) return v;
  try {
    return JSON.parse(s);
  } catch {
    return v;
  }
}

// Deep merge: target gets overwritten by source, but preserves other keys in target
function deepMerge(target, source) {
  if (!source || typeof source !== "object") return target;
  if (!target || typeof target !== "object") target = {};

  const out = Array.isArray(target) ? [...target] : { ...target };

  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      // Recursively merge objects
      out[k] = deepMerge(out[k], v);
    } else {
      // Primitive or Array: overwrite
      out[k] = v;
    }
  }
  return out;
}

function stableStringify(obj) {
  try {
    return JSON.stringify(obj ?? null);
  } catch {
    return "";
  }
}

function toBoolLike(v, def = undefined) {
  if (v === undefined || v === null) return def;
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return def;
}

/* ---------------- defaults (v0006) ---------------- */
function defaultFlagsV6() {
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

function defaultConfigV6() {
  return {
    dashboard: {
      metrics: {
        inputVoltage: true,
        temperature: true,
        humidity: true,
        cpu: true,
        memory: true,
        disk: true,
      },
    },
  };
}

const DASH_METRIC_KEYS = ["inputVoltage", "temperature", "humidity", "cpu", "memory", "disk"];

/**
 * Normalizes dashboard metrics logic
 */
function normalizeDashboardMetrics(metrics, defaultFill = true) {
  const out = {};
  // Default all to true (or false if defaultFill is false)
  for (const k of DASH_METRIC_KEYS) out[k] = !!defaultFill;

  if (!metrics) return out;

  // Case 1: Array (Allow-list) -> ["cpu", "disk"]
  if (Array.isArray(metrics)) {
    for (const k of DASH_METRIC_KEYS) out[k] = false; // Reset to false first
    for (const it of metrics) {
      const kk = clean(it);
      if (DASH_METRIC_KEYS.includes(kk)) out[kk] = true;
    }
    return out;
  }

  // Case 2: Object
  if (typeof metrics === "object") {
    const entries = Object.entries(metrics);

    // Detect "Allow-list Object" pattern:
    // If user sends {cpu: true, disk: true} AND there are NO explicit false values,
    // we assume they want ONLY cpu and disk, so others should be false.
    const hasAny = entries.length > 0;
    const hasFalse = entries.some(([, v]) => toBoolLike(v, null) === false);
    const allTrueish = entries.every(([, v]) => toBoolLike(v, null) === true);

    if (hasAny && !hasFalse && allTrueish) {
      for (const k of DASH_METRIC_KEYS) out[k] = false;
      for (const [k] of entries) {
        const kk = clean(k);
        if (DASH_METRIC_KEYS.includes(kk)) out[kk] = true;
      }
      return out;
    }

    // Case 3: Partial/Full Map Update
    // Just merge specific keys, keep defaults for missing ones
    for (const [k, v] of entries) {
      const kk = clean(k);
      if (!DASH_METRIC_KEYS.includes(kk)) continue;
      const b = toBoolLike(v, undefined);
      if (b !== undefined) out[kk] = b;
    }
    return out;
  }

  return out;
}

/* ---------------- routes ---------------- */

/**
 * GET /api/report-metas/:productId
 * Fetches meta. If missing, creates default.
 * Also performs lazy migration (merging new defaults into old records).
 */
router.get("/:productId(\\d+)", authMiddleware, async (req, res) => {
  try {
    const productId = toInt(req.params.productId, 0);
    if (!productId) return res.status(400).json({ success: false, message: "Bad productId" });

    const product = await Product.unscoped().findByPk(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    
    // Auth Check
    if (!ensureOwnerOrAdmin(product, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    let meta = await ReportMeta.findOne({ where: { productId } });

    // 1. Create if missing
    if (!meta) {
      meta = await ReportMeta.create({
        productId,
        reportName: "Test Report",
        revision: "0.1",
        tplVersion: "v0006",
        flagsJson: defaultFlagsV6(),
        configJson: defaultConfigV6(),
        createdBy: req.user?.id || null,
        updatedBy: req.user?.id || null,
      });
      return res.json({ success: true, data: meta.toJSON() });
    }

    // 2. Merge defaults (Lazy Migration)
    // This ensures if we add new flags in code, old DB records get them automatically
    const mergedFlags = deepMerge(defaultFlagsV6(), meta.flagsJson || {});
    const mergedConfig = deepMerge(defaultConfigV6(), meta.configJson || {});

    // 3. Normalize metrics
    const rawMetrics =
      mergedConfig?.dashboard?.metrics ??
      mergedConfig?.dashboard?.envEnabled ??
      mergedConfig?.metrics ??
      null;

    if (!mergedConfig.dashboard) mergedConfig.dashboard = {};
    mergedConfig.dashboard.metrics = normalizeDashboardMetrics(rawMetrics, true);

    // 4. Update DB if changes detected (Sync DB with Code defaults)
    const needPatch = {};
    if (stableStringify(mergedFlags) !== stableStringify(meta.flagsJson || {})) {
      needPatch.flagsJson = mergedFlags;
    }
    if (stableStringify(mergedConfig) !== stableStringify(meta.configJson || {})) {
      needPatch.configJson = mergedConfig;
    }

    if (Object.keys(needPatch).length > 0) {
      needPatch.updatedBy = req.user?.id || null;
      await meta.update(needPatch); // ✅ Use instance update
      await meta.reload();
    }

    return res.json({ success: true, data: meta.toJSON() });
  } catch (e) {
    console.error("❌ GET /api/report-metas/:productId:", e);
    return res.status(500).json({ success: false, message: "Failed to load report meta" });
  }
});

/**
 * PUT /api/report-metas/:productId
 * Updates report meta. Supports partial JSON updates via deep merging.
 */
router.put("/:productId(\\d+)", authMiddleware, async (req, res) => {
  try {
    const productId = toInt(req.params.productId, 0);
    if (!productId) return res.status(400).json({ success: false, message: "Bad productId" });

    const product = await Product.unscoped().findByPk(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    
    // Auth Check
    if (!ensureOwnerOrAdmin(product, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    let meta = await ReportMeta.findOne({ where: { productId } });

    // Create if missing (safety net)
    if (!meta) {
      meta = await ReportMeta.create({
        productId,
        reportName: "Test Report",
        revision: "0.1",
        tplVersion: "v0006",
        flagsJson: defaultFlagsV6(),
        configJson: defaultConfigV6(),
        createdBy: req.user?.id || null,
        updatedBy: req.user?.id || null,
      });
    }

    const patch = {};

    // Standard fields
    if ("reportName" in req.body) patch.reportName = clean(req.body.reportName) || "Test Report";
    if ("revision" in req.body) patch.revision = clean(req.body.revision) || "0.1";
    if ("tplVersion" in req.body) patch.tplVersion = clean(req.body.tplVersion) || "v0006";

    // JSON Fields - Flags
    if ("flagsJson" in req.body) {
      const incoming = typeof req.body.flagsJson === "string" 
        ? tryParseJson(req.body.flagsJson) 
        : req.body.flagsJson;
      
      // Merge over existing data to allow partial updates
      patch.flagsJson = deepMerge(meta.flagsJson || defaultFlagsV6(), incoming || {});
    }

    // JSON Fields - Config
    if ("configJson" in req.body) {
      const incoming = typeof req.body.configJson === "string" 
        ? tryParseJson(req.body.configJson) 
        : req.body.configJson;

      // 1. Merge basic structure
      const merged = deepMerge(meta.configJson || defaultConfigV6(), incoming || {});

      // 2. Normalize metrics logic specifically
      const rawMetrics =
        merged?.dashboard?.metrics ??
        merged?.dashboard?.envEnabled ??
        merged?.metrics ??
        null;

      if (!merged.dashboard) merged.dashboard = {};
      merged.dashboard.metrics = normalizeDashboardMetrics(rawMetrics, true);

      patch.configJson = merged;
    }

    patch.updatedBy = req.user?.id || null;

    // Execute Update
    await meta.update(patch); // ✅ Use instance update
    await meta.reload();

    return res.json({ success: true, data: meta.toJSON() });
  } catch (e) {
    console.error("❌ PUT /api/report-metas/:productId:", e);
    return res.status(500).json({ success: false, message: "Failed to save report meta" });
  }
});

export default router;