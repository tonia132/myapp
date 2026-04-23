// backend/src/routes/report.js
import { Op } from "sequelize";
import express from "express";
import PDFDocument from "pdfkit";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import * as models from "../models/index.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const { Product, TestCase, File, ReportMeta } = models;

/* =========================
 * Basic helpers
 * ========================= */
const TRUE_SET = new Set(["1", "true", "yes", "y", "on", "checked", "check", "✓", "v", "x"]);
const FALSE_SET = new Set(["0", "false", "no", "n", "off", ""]);

function clean(s) {
  return String(s ?? "").trim();
}
function hasAttr(model, key) {
  return !!model?.rawAttributes?.[key];
}
function toNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function parseJsonMaybe(v) {
  if (!v) return null;
  if (typeof v === "object") return v;
  const s = String(v).trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
function triBool(v) {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (v === null || v === undefined) return null;
  const s = clean(v).toLowerCase();
  if (!s) return null;
  if (TRUE_SET.has(s)) return true;
  if (FALSE_SET.has(s)) return false;
  return null;
}
function boolish(v, def = false) {
  const t = triBool(v);
  return t === null ? def : t;
}
function stripHtmlSimple(s) {
  let t = String(s ?? "");
  if (!t) return "";
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<\/p\s*>/gi, "\n");
  t = t.replace(/<\/div\s*>/gi, "\n");
  t = t.replace(/<li[^>]*>/gi, "• ");
  t = t.replace(/<\/li\s*>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  t = t.replace(/&nbsp;/g, " ");
  t = t.replace(/&amp;/g, "&");
  t = t.replace(/&lt;/g, "<");
  t = t.replace(/&gt;/g, ">");
  return clean(t);
}
function showNA(v) {
  const t = clean(v);
  return t || "N/A";
}
function keepLine(v) {
  const t = clean(v);
  return t || "\u00A0";
}
function rowIsPlanned(r) {
  return triBool(r?.isPlanned ?? r?.planned ?? r?.inPlan ?? r?.checked ?? r?.selected) === true;
}
function csvToSet(v) {
  const s = clean(v);
  if (!s) return new Set();
  return new Set(s.split(",").map((x) => clean(x).toLowerCase()).filter(Boolean));
}

/* =========================
 * ReportMeta / export flags
 * ========================= */
function getReportMetaConfig(reportMetaRow) {
  const cfg =
    parseJsonMaybe(reportMetaRow?.configJson) ||
    parseJsonMaybe(reportMetaRow?.config) ||
    parseJsonMaybe(reportMetaRow?.json) ||
    null;
  return cfg && typeof cfg === "object" ? cfg : {};
}

function getExportFlags(req, reportMetaRow = null) {
  const q = req?.query || {};
  let showSummary = true;

  try {
    const cfg = getReportMetaConfig(reportMetaRow);
    const dashCfg =
      (cfg?.dashboard && typeof cfg.dashboard === "object" ? cfg.dashboard : null) ||
      (cfg?.export && typeof cfg.export === "object" ? cfg.export : null) ||
      (cfg && typeof cfg === "object" ? cfg : null) ||
      null;

    const pickDbVal = (obj) => {
      if (!obj || typeof obj !== "object") return undefined;
      return (
        obj.showSummary ??
        obj.includeSummary ??
        obj.summaryOfTest ??
        obj.showSummaryOfTest ??
        obj.summary ??
        obj.summary_of_test ??
        obj.show_summary_of_test
      );
    };

    const dbVal =
      pickDbVal(dashCfg) ??
      pickDbVal(dashCfg?.sections) ??
      pickDbVal(cfg?.sections) ??
      undefined;

    if (dbVal !== undefined) showSummary = boolish(dbVal, true);
  } catch {}

  const secSet = csvToSet(q.sections || q.include || q.pages);
  if (secSet.size) {
    showSummary =
      secSet.has("summary") ||
      secSet.has("summaryoftest") ||
      secSet.has("summary_of_test") ||
      secSet.has("summary-of-test");
  }

  const dash = parseJsonMaybe(q.dashboard) || parseJsonMaybe(q.dash) || parseJsonMaybe(q.export) || null;
  if (dash && typeof dash === "object") {
    const v = dash.showSummary ?? dash.includeSummary ?? dash.summaryOfTest ?? dash.summary ?? dash.summary_of_test;
    if (v !== undefined) showSummary = boolish(v, showSummary);
  }

  if (q.showSummary !== undefined) showSummary = boolish(q.showSummary, showSummary);
  if (q.summary !== undefined) showSummary = boolish(q.summary, showSummary);
  if (q.noSummary !== undefined) showSummary = !boolish(q.noSummary, false);

  return { showSummary };
}

/* =========================
 * Category / result / section
 * ========================= */
function normalizeResult(v) {
  const s = String(v ?? "pending").trim().toLowerCase();
  if (s === "pass") return "pass";
  if (s === "fail") return "fail";
  return "pending";
}
function resultLabel(v) {
  const r = normalizeResult(v);
  if (r === "pass") return "PASS";
  if (r === "fail") return "FAIL";
  return "Untested";
}
function normalizeCategory(cat) {
  const raw = clean(cat);
  if (!raw) return "HW";
  const up = raw.toUpperCase();
  if (up === "HW") return "HW";
  if (up === "PERF") return "Perf";
  if (up === "RELI") return "Reli";
  if (up === "STAB") return "Stab";
  if (up === "PWR" || up === "POWER") return "PWR";
  if (up === "THRM" || up === "THERM" || up === "THERMAL") return "Thrm";
  if (up === "ESD") return "ESD";
  if (up === "MEP" || up === "MECH") return "MEP";
  return raw;
}
function sectionOfRow(row) {
  const s = clean(row?.section ?? row?.subGroup ?? row?.group ?? "");
  if (s) return s;
  const code = clean(row?.code);
  if (code.includes("_")) return clean(code.split("_")[0]) || "General";
  return "General";
}
const SECTION_KEY_ALIASES = {
  CPU: "CPU",
  MEMORY: "MEM",
  MEM: "MEM",
  NETWORK: "NET",
  NET: "NET",
  WIRELESS: "WLS",
  WLAN: "WLS",
  WIFI: "WLS",
  WLS: "WLS",
  SERIALPORTS: "SP",
  "SERIAL PORTS": "SP",
  SERIAL: "SP",
  SP: "SP",
  BUTTON: "BUT",
  BUT: "BUT",
  LED: "LED",
  LEDS: "LED",
  WATCHDOG: "WDT",
  WATCHDOGTIMER: "WDT",
  WDT: "WDT",
  RTC: "RTC",
  RTCTIMER: "RTC",
  TPM: "TPM",
  GPIO: "GPIO",
  USB: "USB",
  SSD: "SSD",
  NVME: "NVMe",
  AVOIP: "AVoIP",
  POE: "POE",
  "3DMARK": "3DMark",
  "3D MARK": "3DMark",
  CINEBENCH: "CineB",
  CINEB: "CineB",
  AIDA: "AIDA",
  AIDA64: "AIDA",
  PASSMARK: "PASSM",
  PASSMARKPERFORMANCE: "PASSM",
  PASSM: "PASSM",
  CRYSTALDISKMARK: "CDM",
  CDM: "CDM",
  TAT: "TAT",
  TST: "TST",
  TCT: "TCT",
  PME: "PME",
  MPT: "MPT",
  POR: "POR",
  SSC: "SSC",
  PCS: "PCS",
  PCAS: "PCAS",
  CPA: "CPA",
  IRI: "IRI",
  CED: "CED",
  AED: "AED",
  IP6X: "IP6X",
  DROP: "Dro",
  DRO: "Dro",
  VIB: "Vib",
  VIBRATION: "Vib",
  SHOCK: "Vib",
  SHOCKANDVIBRATION: "Vib",
};
function normalizeSectionKey(sec) {
  const raw = clean(sec);
  if (!raw) return "General";
  const up = raw.replace(/\./g, "").replace(/\s+/g, " ").trim().toUpperCase();
  if (SECTION_KEY_ALIASES[up]) return SECTION_KEY_ALIASES[up];
  const tight = up.replace(/[^A-Z0-9]/g, "");
  if (SECTION_KEY_ALIASES[tight]) return SECTION_KEY_ALIASES[tight];
  return raw;
}

/* =========================
 * Remark images
 * ========================= */
function parseRemarkImages(remark) {
  const s = String(remark || "");
  const out = [];

  const md = /!\[[^\]]*]\(([^)]+)\)/g;
  let m;
  while ((m = md.exec(s))) {
    const url = clean(m[1]);
    if (url) out.push(url);
  }

  const html = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((m = html.exec(s))) {
    const url = clean(m[1]);
    if (url) out.push(url);
  }

  return Array.from(new Set(out));
}
function stripImagesFromRemark(remark) {
  let s = String(remark || "");
  s = s.replace(/!\[[^\]]*]\(([^)]+)\)/g, "");
  s = s.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, "");
  return clean(s);
}
function extractFileIdFromUrl(u) {
  const s = String(u || "");
  const m = s.match(/\/files\/(\d+)(?:\/|$)/i);
  if (m?.[1]) {
    const id = Number(m[1]);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
}

/* =========================
 * 新加的helprs
 * ========================= */
function parseMeasureWidgetsFromRow(r) {
  const extraObj =
    (r?.extra && typeof r.extra === "object" && !Array.isArray(r.extra) ? r.extra : null) ||
    parseJsonMaybe(r?.extra) ||
    parseJsonMaybe(r?.meta) ||
    parseJsonMaybe(r?.tcMeta) ||
    {};

  const raw = Array.isArray(extraObj?.measureWidgets)
    ? extraObj.measureWidgets
    : Array.isArray(r?.measureWidgets)
      ? r.measureWidgets
      : [];

  return raw
    .map((it, idx) => ({
      id: clean(it?.id) || `mw_${idx + 1}`,
      label: clean(it?.label) || `Item ${idx + 1}`,
      spec: String(it?.spec ?? ""),
      temp: String(it?.temp ?? ""),
      enabled: it?.enabled !== false,
      isDefault: !!it?.isDefault,
    }))
    .filter((it) => it.enabled !== false);
}

/* =========================
 * File path / image loader
 * ========================= */
function guessUploadRoot() {
  const env = clean(process.env.UPLOAD_DIR);
  if (env) return env;

  const cands = [
    path.resolve(process.cwd(), "uploads"),
    path.resolve(process.cwd(), "upload"),
    path.resolve(process.cwd(), "public", "uploads"),
    path.resolve(process.cwd(), "public", "upload"),
    path.resolve(process.cwd(), "..", "uploads"),
    path.resolve(process.cwd(), "..", "public", "uploads"),
  ];
  for (const p of cands) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
    } catch {}
  }
  return process.cwd();
}

function resolveExistingPath(candidates) {
  for (const p of candidates) {
    if (!p) continue;
    try {
      const pp = path.resolve(String(p));
      if (fs.existsSync(pp) && fs.statSync(pp).isFile()) return pp;
    } catch {}
  }
  return null;
}

function resolveFileDiskPath(fileRec) {
  if (!fileRec) return null;
  const uploadRoot = guessUploadRoot();

  const fields = [
    "path",
    "filePath",
    "filepath",
    "storagePath",
    "diskPath",
    "fullPath",
    "absPath",
    "localPath",
    "relativePath",
    "relPath",
    "savedPath",
    "savePath",
    "destination",
  ];

  const candidates = [];

  for (const k of fields) {
    const v = clean(fileRec?.[k]);
    if (!v) continue;
    if (path.isAbsolute(v)) candidates.push(v);
    candidates.push(path.resolve(process.cwd(), v));
    candidates.push(path.resolve(uploadRoot, v));
  }

  const stored = clean(
    fileRec?.storedName ||
      fileRec?.savedName ||
      fileRec?.filename ||
      fileRec?.fileName ||
      fileRec?.diskName
  );
  const folder = clean(fileRec?.folder || fileRec?.dir || fileRec?.directory || fileRec?.subdir);
  if (stored) {
    if (folder) candidates.push(path.resolve(uploadRoot, folder, stored));
    candidates.push(path.resolve(uploadRoot, stored));
  }

  return resolveExistingPath(candidates);
}

function FileAny() {
  return File?.unscoped ? File.unscoped() : File;
}

async function loadImageBufferFromUrlOrFile(u, metaCache, bufferCache) {
  const url = clean(u);
  if (!url) return null;

  const cachedBuffer = bufferCache.get(url);
  if (cachedBuffer !== undefined) return cachedBuffer;

  const fileId = extractFileIdFromUrl(url);
  if (fileId && File) {
    let rec = metaCache.get(`id:${fileId}`);
    if (rec === undefined) {
      rec = await FileAny().findByPk(fileId, { raw: true }).catch(() => null);
      metaCache.set(`id:${fileId}`, rec || null);
    }
    const disk = resolveFileDiskPath(rec);
    if (disk) {
      try {
        const buf = await fs.promises.readFile(disk);
        bufferCache.set(url, buf);
        return buf;
      } catch {}
    }
  }

  if (/^https?:\/\//i.test(url)) {
    try {
      const fetchFn =
        globalThis.fetch ||
        (await import("node-fetch").then((m) => m.default).catch(() => null));
      if (!fetchFn) return null;

      const r = await fetchFn(url);
      if (!r.ok) return null;
      const ab = await r.arrayBuffer();
      const buf = Buffer.from(ab);
      bufferCache.set(url, buf);
      return buf;
    } catch {
      return null;
    }
  }

  bufferCache.set(url, null);
  return null;
}

async function loadImageBufferFromAny(src, cache) {
  if (!src) return null;
  if (Buffer.isBuffer(src)) return src;

  const metaCache = cache?.metaCache || cache;
  const bufferCache = cache?.bufferCache || cache;

  const s = String(src).trim();
  if (!s) return null;

  const cachedBuffer = bufferCache.get(s);
  if (cachedBuffer !== undefined) return cachedBuffer;

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(s)) {
    try {
      const b64 = s.split(",")[1] || "";
      if (!b64) return null;
      const buf = Buffer.from(b64, "base64");
      bufferCache.set(s, buf);
      return buf;
    } catch {
      return null;
    }
  }

  try {
    const maybeAbs = path.isAbsolute(s) ? s : path.resolve(process.cwd(), s);
    if (fs.existsSync(maybeAbs) && fs.statSync(maybeAbs).isFile()) {
      const buf = await fs.promises.readFile(maybeAbs);
      bufferCache.set(s, buf);
      return buf;
    }
  } catch {}

  if (/^\d+$/.test(s) && File) {
    const fileId = Number(s);
    let rec = metaCache.get(`id:${fileId}`);
    if (rec === undefined) {
      rec = await FileAny().findByPk(fileId, { raw: true }).catch(() => null);
      metaCache.set(`id:${fileId}`, rec || null);
    }
    const disk = resolveFileDiskPath(rec);
    if (disk) {
      try {
        const buf = await fs.promises.readFile(disk);
        bufferCache.set(s, buf);
        return buf;
      } catch {}
    }
    bufferCache.set(s, null);
    return null;
  }

  const byUrl = await loadImageBufferFromUrlOrFile(s, metaCache, bufferCache);
  if (byUrl) return byUrl;

  if (File && /\.(png|jpe?g|webp)$/i.test(s)) {
    const cacheKey = `name:${s}`;
    let rec = metaCache.get(cacheKey);
    if (rec === undefined) {
      rec = await FileAny()
        .findOne({
          where: {
            [Op.or]: [
              hasAttr(File, "originalName") ? { originalName: s } : null,
              hasAttr(File, "displayName") ? { displayName: s } : null,
              hasAttr(File, "storedName") ? { storedName: s } : null,
            ].filter(Boolean),
          },
          raw: true,
        })
        .catch(() => null);
      metaCache.set(cacheKey, rec || null);
    }
    const disk = resolveFileDiskPath(rec);
    if (disk) {
      try {
        const buf = await fs.promises.readFile(disk);
        bufferCache.set(s, buf);
        return buf;
      } catch {}
    }
  }

  bufferCache.set(s, null);
  return null;
}

/* =========================
 * Report meta
 * ========================= */
function getReportMeta(product, req) {
  const q = req?.query || {};

  const meta1 =
    parseJsonMaybe(product?.reportMeta) ||
    parseJsonMaybe(product?.testReportMeta) ||
    parseJsonMaybe(product?.meta) ||
    null;

  let meta2 = null;
  if (q.meta) meta2 = parseJsonMaybe(q.meta);
  if (!meta2 && q.metaB64) {
    try {
      const raw = Buffer.from(String(q.metaB64), "base64").toString("utf8");
      meta2 = parseJsonMaybe(raw);
    } catch {}
  }

  const merged = { ...(meta1 || {}), ...(meta2 || {}) };

  const overrides = {
    projectName: q.projectName,
    reportName: q.reportName,
    revision: q.revision,
    releasedDate: q.releasedDate || q.releaseDate || q.reportDate,
    dbVersion: q.dbVersion || q.databaseVersion,
    preparedBy: q.preparedBy || q.testedBy,
    approvedBy: q.approvedBy || q.reviewedBy,
    preparedSig: q.preparedSig || q.preparedSignature || q.preparedSignatureFileId || q.preparedSigFileId || "",
    approvedSig:
      q.approvedSig ||
      q.approvedSignature ||
      q.approvedSignatureFileId ||
      q.approvedSigFileId ||
      q.reviewedSig ||
      q.reviewedSignature ||
      q.reviewedSignatureFileId ||
      q.reviewedSigFileId ||
      "",
  };

  for (const [k, v] of Object.entries(overrides)) {
    const vv = clean(v);
    if (vv) merged[k] = vv;
  }

  if (!clean(merged.preparedSig) && clean(merged.preparedSigFileId)) merged.preparedSig = clean(merged.preparedSigFileId);

  if (!clean(merged.approvedSig) && (clean(merged.approvedSigFileId) || clean(merged.reviewedSigFileId))) {
    merged.approvedSig = clean(merged.approvedSigFileId || merged.reviewedSigFileId);
  }

  if (!clean(merged.approvedSig) && clean(merged.reviewedSig)) merged.approvedSig = clean(merged.reviewedSig);

  return merged;
}

/* =========================
 * Fetch report data
 * ========================= */
async function fetchReportData(productId, filters = {}) {
  const kw = clean(filters.kw || filters.keyword || "");
  const v0006Mode = boolish(filters.v0006 || filters.v6 || filters.onlyChecked || filters.onlyPlanned, false);

  const selectedCsv = clean(filters.selected || filters.checked || filters.tcSelected || filters.tc || "");
  const selectedTokens = selectedCsv ? selectedCsv.split(",").map(clean).filter(Boolean) : [];

  const selectedIds = selectedTokens
    .filter((t) => /^\d+$/.test(t))
    .map((t) => Number(t))
    .filter((n) => Number.isFinite(n) && n > 0);

  const selectedCodes = selectedTokens.filter((t) => !/^\d+$/.test(t)).map(clean).filter(Boolean);
  const hasSelectionFilter = selectedIds.length > 0 || selectedCodes.length > 0;

  const plan = clean(filters.plan || (v0006Mode ? "planned" : ""));
  const resultF = clean(filters.result || "");
  const catsCsv = clean(filters.cats || "");
  const cats = catsCsv ? catsCsv.split(",").map((s) => normalizeCategory(s)).filter(Boolean) : [];
  const catsSet = new Set(cats);
  const catsOrder = new Map(cats.map((k, i) => [k, i]));

  const product = await Product?.findByPk(productId, { raw: true }).catch(() => null);

  const where = {};
  if (hasAttr(TestCase, "productId")) where.productId = productId;
  else if (hasAttr(TestCase, "ProductId")) where.ProductId = productId;

  if (hasAttr(TestCase, "deletedAt")) where.deletedAt = null;
  if (hasAttr(TestCase, "isDeleted")) where.isDeleted = false;
  if (hasAttr(TestCase, "status")) where.status = { [Op.notIn]: ["deleted", "trash"] };

  if (hasSelectionFilter) {
    const ors = [];
    if (selectedIds.length) ors.push({ id: { [Op.in]: selectedIds } });
    if (selectedCodes.length && hasAttr(TestCase, "code")) ors.push({ code: { [Op.in]: selectedCodes } });
    if (ors.length) where[Op.or] = ors;
  }

  if (kw) {
    const ors = [];
    if (hasAttr(TestCase, "code")) ors.push({ code: { [Op.like]: `%${kw}%` } });
    if (hasAttr(TestCase, "testCase")) ors.push({ testCase: { [Op.like]: `%${kw}%` } });
    if (hasAttr(TestCase, "name")) ors.push({ name: { [Op.like]: `%${kw}%` } });
    if (hasAttr(TestCase, "title")) ors.push({ title: { [Op.like]: `%${kw}%` } });

    if (ors.length) {
      if (where[Op.or]) where[Op.and] = [{ [Op.or]: ors }, { [Op.or]: where[Op.or] }], delete where[Op.or];
      else where[Op.or] = ors;
    }
  }

  if (plan && hasAttr(TestCase, "isPlanned")) {
    if (plan === "unplanned") where.isPlanned = false;
    else if (plan === "planned" && v0006Mode) where.isPlanned = true;
  }

  const order = [];
  if (hasAttr(TestCase, "category")) order.push(["category", "ASC"]);
  if (hasAttr(TestCase, "section")) order.push(["section", "ASC"]);
  else if (hasAttr(TestCase, "subGroup")) order.push(["subGroup", "ASC"]);
  else if (hasAttr(TestCase, "group")) order.push(["group", "ASC"]);
  if (hasAttr(TestCase, "code")) order.push(["code", "ASC"]);
  order.push(["id", "ASC"]);

  const rowsRaw = await TestCase?.findAll?.({ where, order, raw: true }).catch((err) => {
    console.error("[report] TestCase.findAll failed:", err?.message || err);
    return [];
  });
  const rows = Array.isArray(rowsRaw) ? rowsRaw : [];

  const filtered = rows.filter((r) => {
    const st = String(r?.status || "").toLowerCase();
    if (st === "deleted" || st === "trash") return false;

    if (hasSelectionFilter) {
      const idOk = selectedIds.length ? selectedIds.includes(Number(r?.id)) : false;
      const codeOk = selectedCodes.length ? selectedCodes.includes(clean(r?.code)) : false;
      if (!idOk && !codeOk) return false;
    }

    if (plan) {
      const planned = v0006Mode ? rowIsPlanned(r) : (r?.isPlanned !== false);
      if (plan === "planned" && !planned) return false;
      if (plan === "unplanned" && planned) return false;
    }

    if (resultF && normalizeResult(r?.result) !== normalizeResult(resultF)) return false;

    if (catsSet.size) {
      const ck = normalizeCategory(r?.category);
      if (!catsSet.has(ck)) return false;
    }

    return true;
  });

  const catMap = new Map();

  const pickRowText = (row, keys) => {
    for (const k of keys) {
      if (row?.[k] === undefined || row?.[k] === null) continue;
      const s = stripHtmlSimple(row[k]);
      if (s) return s;
    }
    return "";
  };

  for (const r of filtered) {
    const cat = normalizeCategory(r?.category);
    const secRaw = sectionOfRow(r);
    const secKey = normalizeSectionKey(secRaw);
    const secTitle = clean(secRaw) || secKey;

    if (!catMap.has(cat)) catMap.set(cat, new Map());
    const secMap = catMap.get(cat);

    if (!secMap.has(secKey)) secMap.set(secKey, { sectionKey: secKey, sectionTitle: secTitle, items: [] });
    const bucket = secMap.get(secKey);

    const remark = String(r?.remark ?? "");
    const imgs = parseRemarkImages(remark);
    const remarkText = stripImagesFromRemark(remark);

    const procedureText = pickRowText(r, ["procedure", "procedures", "steps", "step", "testProcedure", "testProcedures", "procedureText"]);
    const criteriaText = pickRowText(r, [
      "criteria", "criteriaText", "criterias",
      "passCriteria", "pass_criteria",
      "acceptanceCriteria", "acceptance_criteria",
      "testCriteria", "test_criteria",
      "criteriaDesc", "criteria_desc",
      "criteriaDescription", "criteria_description",
      "expected", "expectedResult", "expected_result",
      "expect", "expectResult", "expect_result",
    ]);

bucket.items.push({
  id: r?.id,
  tcCode: clean(r?.code),
  testCase: String(r?.testCase ?? r?.name ?? r?.title ?? ""),
  result: normalizeResult(r?.result),
  resultLabel: resultLabel(r?.result),
  workHours: toNum(r?.workHrs ?? r?.workHours ?? 0, 0),
  procedureText,
  criteriaText,
  remarkText,
  images: imgs,
  measureWidgets: parseMeasureWidgetsFromRow(r), // ✅ 新增
});
  }

  const groups = [];
  for (const [category, secMap] of catMap.entries()) {
    const sections = [];
    for (const bucket of secMap.values()) {
      const items = bucket.items || [];
      let pass = 0, fail = 0, pending = 0, workSum = 0;
      for (const it of items) {
        if (it.result === "pass") pass++;
        else if (it.result === "fail") fail++;
        else pending++;
        workSum += toNum(it.workHours, 0);
      }
      sections.push({
        sectionKey: bucket.sectionKey,
        sectionTitle: bucket.sectionTitle,
        section: bucket.sectionTitle,
        total: items.length,
        pass,
        fail,
        pending,
        workHours: workSum,
        rows: items,
      });
    }
    groups.push({ category, sections });
  }

  groups.sort((a, b) => {
    if (catsOrder.size) return (catsOrder.get(a.category) ?? 9999) - (catsOrder.get(b.category) ?? 9999);
    return String(a.category).localeCompare(String(b.category));
  });

  const summary = groups.map((g) => {
    let total = 0, pass = 0, fail = 0, pending = 0, workHours = 0;
    for (const s of g.sections || []) {
      total += s.total || 0;
      pass += s.pass || 0;
      fail += s.fail || 0;
      pending += s.pending || 0;
      workHours += toNum(s.workHours, 0);
    }
    return { category: g.category, total, pass, fail, pending, workHours };
  });

  const overall = summary.reduce(
    (acc, x) => {
      acc.total += x.total || 0;
      acc.pass += x.pass || 0;
      acc.fail += x.fail || 0;
      acc.pending += x.pending || 0;
      acc.workHours += toNum(x.workHours, 0);
      return acc;
    },
    { total: 0, pass: 0, fail: 0, pending: 0, workHours: 0 }
  );

  return { product: product || { id: productId }, groups, summary, overall };
}

/* =========================
 * PDF helpers / constants
 * ========================= */
function yyyymmdd(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
function safeFilename(s) {
  return String(s || "")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}
function ensureSpace(doc, need, marginBottom = 70) {
  const bottom = doc.page.height - marginBottom;
  if (doc.y + need > bottom) {
    if (typeof doc._v0006AddPage === "function") doc._v0006AddPage();
    else {
      doc.addPage();
      doc.y = 90;
    }
    return true;
  }
  return false;
}
function parseDateLike(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}
function pickFirst(obj, keys, fallback = "") {
  for (const k of keys) {
    const v = obj?.[k];
    if (v === undefined || v === null) continue;
    const s = clean(v);
    if (s) return s;
  }
  return fallback;
}
function pickReleasedDate(product, req, meta) {
  const q = req?.query || {};
  const qd = parseDateLike(q.releasedDate || q.releaseDate || q.reportDate);
  if (qd) return qd;

  const md = parseDateLike(meta?.releasedDate || meta?.releaseDate || meta?.reportDate);
  if (md) return md;

  const keys = ["releasedDate", "reportReleasedDate", "coverReleasedDate", "releaseDate", "releasedAt", "reportDate"];
  for (const k of keys) {
    const d = parseDateLike(product?.[k]);
    if (d) return d;
  }
  return new Date();
}
function formatDateEn(dLike) {
  const d = dLike ? new Date(dLike) : new Date();
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}
function pct(numer, denom) {
  const a = Number(numer);
  const b = Number(denom);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return "0.0%";
  return `${((a / b) * 100).toFixed(1)}%`;
}

const LAYOUT = {
  left: 58,
  right: 555,
  topY: 90,
  bottomMargin: 70,
};

const V0006 = {
  blue: "#1f4e79",
  blue2: "#2f6ea5",
  lightBlue: "#d9e8f5",
  lineBlue: "#1f4e79",
  gray: "#666666",
  red: "#c00000",
  pass: "#0a8a3a",
  fail: "#c00000",
  pending: "#7a7a7a",
};

const REPORT_COMPANY = clean(process.env.REPORT_COMPANY || "APLEX Technology Inc.");
const REPORT_CONFIDENTIAL = clean(process.env.REPORT_CONFIDENTIAL || "Confidential");
const REPORT_TAGLINE = clean(process.env.REPORT_TAGLINE || "Smart Industry Enabler");
const REPORT_WEBSITE = clean(process.env.REPORT_WEBSITE || "www.aplex.com");

function rectFillStroke(doc, x, y, w, h, fillColor, strokeColor, lineW = 1) {
  doc.save();
  if (fillColor) doc.fillColor(fillColor).rect(x, y, w, h).fill();
  doc.lineWidth(lineW).strokeColor(strokeColor || "#000").rect(x, y, w, h).stroke();
  doc.restore();
}
function polyFill(doc, pts, fillColor) {
  doc.save().fillColor(fillColor || "#000");
  doc.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) doc.lineTo(pts[i], pts[i + 1]);
  doc.closePath().fill();
  doc.restore();
}
function drawTitleWithUnderline(doc, text, x, y, color = V0006.blue) {
  doc.save();
  doc.fillColor(color).font("Helvetica-Bold").fontSize(20).text(text, x, y);
  const w = doc.widthOfString(text);
  doc.moveTo(x, y + 26).lineTo(x + w, y + 26).lineWidth(1.2).strokeColor(color).stroke();
  doc.restore();
}
function drawV0006TopBand(doc) {
  const W = doc.page.width;
  doc.save();
  doc.rect(0, 0, W, 56).fill(V0006.lightBlue);
  doc.rect(0, 0, W, 10).fill(V0006.blue2);
  polyFill(doc, [W - 170, 0, W, 0, W, 70, W - 230, 70], V0006.blue);
  doc.moveTo(0, 56).lineTo(W, 56).lineWidth(0.9).strokeColor(V0006.blue).stroke();

  doc.fillColor("#000").font("Helvetica-Bold").fontSize(13);
  doc.text("APLEX", W - 150, 18, { width: 140, align: "left" });
  doc.font("Helvetica").fontSize(9);
  doc.text("Technology", W - 150, 34, { width: 140, align: "left" });
  doc.restore();
}
function drawV0006Footer(doc, pageNo) {
  const W = doc.page.width;
  const H = doc.page.height;

  const oldBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  doc.save();
  doc.font("Helvetica").fontSize(11).fillColor("#000");
  doc.text(`- ${pageNo} -`, 0, H - 52, { width: W, align: "center", lineBreak: false });

  doc.font("Helvetica-Bold").fontSize(11).fillColor(V0006.red);
  doc.text(`${REPORT_COMPANY} - ${REPORT_CONFIDENTIAL}`, 0, H - 34, {
    width: W,
    align: "center",
    lineBreak: false,
  });
  doc.restore();

  doc.page.margins.bottom = oldBottom;
}
function decorateV0006(doc, { coverHasFooter = false, drawTopBand = true, drawFooter = true } = {}) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    const pageNo = i + 1;
    try {
      doc.switchToPage(range.start + i);
      if (drawTopBand) drawV0006TopBand(doc);
      if (drawFooter && (pageNo !== 1 || coverHasFooter)) drawV0006Footer(doc, pageNo);
    } catch (e) {
      console.error("[report] decorate page failed:", pageNo, e?.message || e);
    }
  }
}

/* =========================
 * Optional template background
 * ========================= */
function guessTemplateDir() {
  const env = clean(process.env.REPORT_TEMPLATE_DIR);
  if (env && fs.existsSync(env)) return env;

  const cands = [
    path.resolve(process.cwd(), "template_pages"),
    path.resolve(process.cwd(), "assets", "template_pages"),
    path.resolve(process.cwd(), "src", "assets", "template_pages"),
    path.resolve(process.cwd(), "backend", "template_pages"),
    path.resolve(process.cwd(), "backend", "src", "assets", "template_pages"),
    path.resolve(process.cwd(), "..", "template_pages"),
  ];
  for (const p of cands) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
    } catch {}
  }
  return null;
}
function resolveTemplatePath(dir, name) {
  if (!dir) return null;
  const p = path.resolve(dir, name);
  try {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  } catch {}
  return null;
}
async function preloadTemplateBuffers(tplCache) {
  const dir = guessTemplateDir();
  if (!dir) return;

  const map = {
    cover: "page_01.png",
    summary: "page_02.png",
    toc: "page_03.png",
    body: "page_04.png",
    config: "page_05.png",
  };

  for (const [k, fn] of Object.entries(map)) {
    const p = resolveTemplatePath(dir, fn);
    if (!p || tplCache.has(k)) continue;
    try {
      tplCache.set(k, await fs.promises.readFile(p));
    } catch {}
  }
}
function applyTemplateSync(doc, key, tplCache) {
  const buf = tplCache.get(key);
  if (!buf) return;
  doc.save();
  doc.image(buf, 0, 0, { width: doc.page.width, height: doc.page.height });
  doc.restore();
}

/* =========================
 * Cover / summary
 * ========================= */
async function drawCoverV0006(doc, { sysName, rev, product, req, cache, meta }) {
  const W = doc.page.width;
  const H = doc.page.height;

  const releasedDate = pickReleasedDate(product, req, meta);
  const dbVer =
    clean(meta?.dbVersion) || pickFirst(product, ["dbVersion", "databaseVersion", "templateVersion"], "v0006");

  const preparedBy = clean(meta?.preparedBy) || pickFirst(product, ["preparedBy", "testedBy", "tester", "owner"], "");
  const approvedBy = clean(meta?.approvedBy) || pickFirst(product, ["approvedBy", "reviewedBy", "approver", "reviewer"], "");

  const preparedSigSrc =
    clean(meta?.preparedSig) ||
    clean(meta?.preparedSigFileId) ||
    pickFirst(
      product,
      [
        "preparedSignatureFileId",
        "preparedSigFileId",
        "preparedSignatureUrl",
        "preparedSignature",
        "coverPreparedSignatureFileId",
        "coverPreparedSigFileId",
        "coverPreparedSignature",
      ],
      ""
    );

  const approvedSigSrc =
    clean(meta?.approvedSig) ||
    clean(meta?.approvedSigFileId) ||
    clean(meta?.reviewedSigFileId) ||
    pickFirst(
      product,
      [
        "approvedSignatureFileId",
        "approvedSigFileId",
        "approvedSignatureUrl",
        "approvedSignature",
        "coverApprovedSignatureFileId",
        "coverApprovedSigFileId",
        "coverApprovedSignature",
      ],
      ""
    );

  doc.fillColor("#000");
  doc.font("Helvetica").fontSize(34).text(sysName, 0, 200, { width: W, align: "center" });
  doc.font("Helvetica").fontSize(18).text("Test Report", 0, 258, { width: W, align: "center" });

  doc.font("Helvetica-Bold").fontSize(12).text(`Revision: R${rev}`, 0, 346, { width: W, align: "center" });
  doc.font("Helvetica-Bold").fontSize(12).text(`Released Date: ${formatDateEn(releasedDate)}`, 0, 388, { width: W, align: "center" });

  const boxW = 330;
  const boxH = 104;
  const boxX = (W - boxW) / 2;
  const boxY = 610;
  const headerH = 20;

  doc.rect(boxX, boxY, boxW, boxH).lineWidth(1).strokeColor("#000").stroke();
  rectFillStroke(doc, boxX, boxY, boxW, headerH, V0006.lightBlue, "#000", 1);

  doc.dash(3, { space: 2 }).moveTo(boxX + boxW / 2, boxY).lineTo(boxX + boxW / 2, boxY + boxH).strokeColor("#000").stroke().undash();
  doc.dash(3, { space: 2 }).moveTo(boxX, boxY + headerH).lineTo(boxX + boxW, boxY + headerH).strokeColor("#000").stroke().undash();

  doc.fillColor("#000").font("Helvetica").fontSize(10);
  doc.text("Prepared & Tested By", boxX, boxY + 5, { width: boxW / 2, align: "center" });
  doc.text("Reviewed & Approved By", boxX + boxW / 2, boxY + 5, { width: boxW / 2, align: "center" });

  const cellPad = 8;
  const cellY = boxY + headerH + 6;
  const cellH = boxH - headerH - 12;

  const leftCellX = boxX + cellPad;
  const leftCellW = boxW / 2 - cellPad * 2;
  const rightCellX = boxX + boxW / 2 + cellPad;
  const rightCellW = boxW / 2 - cellPad * 2;

  const sig1 = await loadImageBufferFromAny(preparedSigSrc, cache);
  if (sig1) {
    try {
      doc.image(sig1, leftCellX, cellY, { fit: [leftCellW, cellH], align: "center", valign: "center" });
    } catch (e) {
      console.error("[report] embed prepared signature failed:", e?.message || e);
    }
  } else if (preparedBy) {
    doc.font("Helvetica").fontSize(9).fillColor("#000");
    doc.text(preparedBy, leftCellX, boxY + headerH + 56, { width: leftCellW });
  }

  const sig2 = await loadImageBufferFromAny(approvedSigSrc, cache);
  if (sig2) {
    try {
      doc.image(sig2, rightCellX, cellY, { fit: [rightCellW, cellH], align: "center", valign: "center" });
    } catch (e) {
      console.error("[report] embed approved signature failed:", e?.message || e);
    }
  } else if (approvedBy) {
    doc.font("Helvetica").fontSize(9).fillColor("#000");
    doc.text(approvedBy, rightCellX, boxY + headerH + 56, { width: rightCellW });
  }

  doc.fillColor(V0006.blue).font("Helvetica-Bold").fontSize(12);
  doc.text(REPORT_TAGLINE, 58, H - 92);

  doc.fillColor("#000").font("Helvetica").fontSize(9);
  doc.text(REPORT_WEBSITE, 58, H - 74);

  doc.fillColor("#000").font("Helvetica").fontSize(10);
  doc.text(`Database ver. ${dbVer}`, 0, H - 82, { width: W - 58, align: "right" });
}

function drawSummaryV0006(doc, { summary = [], overall = {}, product, onlyCatsSet = null }) {
  drawTitleWithUnderline(doc, "Summary of Test", 58, 108, V0006.blue);

  const order = [
    { key: "HW", name: "Hardware Functions" },
    { key: "Perf", name: "Performance" },
    { key: "Reli", name: "Reliability" },
    { key: "Stab", name: "Stability" },
    { key: "PWR", name: "Power Consumption" },
    { key: "Thrm", name: "Thermal Profile" },
    { key: "ESD", name: "Electrostatic Discharge (ESD)" },
    { key: "MEP", name: "Mechanical Protection" },
  ];

  const map = new Map((summary || []).map((s) => [String(s.category), s]));

  const baseRows = order.map((o) => {
    const s = map.get(o.key) || {};
    return {
      key: o.key,
      name: o.name,
      total: Number(s.total || 0),
      pass: Number(s.pass || 0),
      fail: Number(s.fail || 0),
      pending: Number(s.pending || 0),
    };
  });

  const rows =
    Array.isArray(onlyCatsSet) || onlyCatsSet instanceof Set
      ? baseRows.filter((r) => (onlyCatsSet?.size ? onlyCatsSet.has(r.key) : true))
      : baseRows;

  const finalRows = rows.length ? rows : baseRows;

  const x1 = 36, x2 = 299, x3 = 362, x4 = 426, x5 = 490, x6 = 555;
  const yTop = 155;
  const headerH = 20;
  const rowH = 18;

  const tableW = x6 - x1;
  const tableH = headerH + finalRows.length * rowH;

  rectFillStroke(doc, x1, yTop, tableW, headerH, V0006.lightBlue, V0006.lineBlue, 1);

  doc.save();
  doc.rect(x1, yTop, tableW, tableH).lineWidth(1).strokeColor(V0006.lineBlue).stroke();
  for (const xx of [x2, x3, x4, x5]) doc.moveTo(xx, yTop).lineTo(xx, yTop + tableH).strokeColor(V0006.lineBlue).stroke();
  for (let i = 0; i <= finalRows.length; i++) {
    const yy = yTop + headerH + i * rowH;
    doc.moveTo(x1, yy).lineTo(x6, yy).strokeColor(V0006.lineBlue).stroke();
  }
  doc.restore();

  doc.fillColor(V0006.blue).font("Helvetica-Bold").fontSize(10);
  doc.text("Category of Test Cases", x1 + 6, yTop + 5, { width: x2 - x1 - 12 });
  doc.text("Total TC #", x2, yTop + 5, { width: x3 - x2, align: "center" });
  doc.text("Pass", x3, yTop + 5, { width: x4 - x3, align: "center" });
  doc.text("Fail", x4, yTop + 5, { width: x5 - x4, align: "center" });
  doc.text("Untested", x5, yTop + 5, { width: x6 - x5, align: "center" });

  doc.font("Helvetica").fontSize(10);
  for (let i = 0; i < finalRows.length; i++) {
    const r = finalRows[i];
    const yy = yTop + headerH + i * rowH + 4;

    doc.fillColor("#000");
    doc.text(r.name, x1 + 6, yy, { width: x2 - x1 - 12 });

    doc.fillColor("#000");
    doc.text(String(r.total), x2, yy, { width: x3 - x2, align: "center" });

    doc.fillColor(V0006.pass);
    doc.text(String(r.pass), x3, yy, { width: x4 - x3, align: "center" });

    doc.fillColor(V0006.fail);
    doc.text(String(r.fail), x4, yy, { width: x5 - x4, align: "center" });

    doc.fillColor(V0006.pending);
    doc.text(String(r.pending), x5, yy, { width: x6 - x5, align: "center" });
  }

  const total = Number(overall?.total || 0);
  const pass = Number(overall?.pass || 0);
  const fail = Number(overall?.fail || 0);
  const done = pass + fail;

  const rateY0 = yTop + tableH + 14;
  const rateRowH = 22;

  function rateLine(label, value, yy) {
    doc.save();
    doc.rect(x1, yy, tableW, rateRowH).lineWidth(1).strokeColor(V0006.lineBlue).stroke();
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#666");
    doc.text(label, x1 + 10, yy + 6, { width: tableW - 20 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#000");
    doc.text(value, x1, yy + 6, { width: tableW - 10, align: "right" });
    doc.restore();
  }

  rateLine("Completed Rate", pct(done, total), rateY0);
  rateLine("PASS Rate", pct(pass, total), rateY0 + rateRowH);
  rateLine("FAIL Rate", pct(fail, total), rateY0 + rateRowH * 2);

  const remarksTitleY = rateY0 + rateRowH * 3 + 14;
  const remarksBoxY = remarksTitleY + 22;
  const remarksBoxH = 300;

  rectFillStroke(doc, x1, remarksTitleY, tableW, 22, V0006.lightBlue, V0006.lineBlue, 1);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000");
  doc.text("Remarks :", x1 + 10, remarksTitleY + 6);

  doc.save();
  doc.rect(x1, remarksBoxY, tableW, remarksBoxH).lineWidth(1).strokeColor(V0006.lineBlue).stroke();
  doc.restore();

  const remarksText = pickFirst(product, ["summaryRemark", "summaryRemarks", "reportRemark", "remark", "remarks"], "");
  if (remarksText) {
    doc.fillColor("#000").font("Helvetica").fontSize(10);
    doc.text(stripHtmlSimple(remarksText), x1 + 10, remarksBoxY + 10, { width: tableW - 20, height: remarksBoxH - 20 });
  }
}

/* =========================
 * TOC helpers
 * ========================= */
function addNamedDestinationSafe(doc, name) {
  if (!name) return;
  try {
    if (typeof doc.addNamedDestination === "function") return doc.addNamedDestination(name);
  } catch {}
  try {
    if (typeof doc.addDestination === "function") return doc.addDestination(name);
  } catch {}
}
function addInternalLinkSafe(doc, x, y, w, h, destName) {
  if (!destName) return;
  try {
    if (typeof doc.goTo === "function") return doc.goTo(x, y, w, h, destName);
  } catch {}
  try {
    if (typeof doc.link === "function") return doc.link(x, y, w, h, { goTo: destName });
  } catch {}
  try {
    if (typeof doc.link === "function") return doc.link(x, y, w, h, { dest: destName });
  } catch {}
}
function makeDestName(prefix, raw) {
  const s = String(raw || "").trim();
  const safe = s.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return `${prefix}_${safe || "x"}`;
}

function estimateTocPagesFromEntriesCount(count) {
  const startYFirst = 155;
  const startYNext = 110;
  const bottomY = 760;
  const lineH = 20;

  const capFirst = Math.max(1, Math.floor((bottomY - startYFirst) / lineH));
  const capNext = Math.max(1, Math.floor((bottomY - startYNext) / lineH));

  if (count <= capFirst) return 1;
  const rest = count - capFirst;
  return 1 + Math.ceil(rest / capNext);
}
function ellipsisToWidth(doc, text, maxW) {
  let s = String(text || "");
  if (doc.widthOfString(s) <= maxW) return s;
  while (s.length > 0 && doc.widthOfString(s + "…") > maxW) s = s.slice(0, -1);
  return s + "…";
}
function renderTocV0006(doc, tocEntries, tocStartNo, tocPageCount) {
  const xLeft = 58;
  const baseNumX = xLeft;
  const wNum = 36;
  const baseTitleX = baseNumX + wNum + 18;
  const right = 555;
  const pageBoxW = 28;
  const xPage = right - pageBoxW;

  const startYFirst = 155;
  const startYNext = 110;
  const bottomY = 760;

  let pageIdx = 0;
  let y = startYFirst;

  function switchToTocPage(i) {
    doc.switchToPage(tocStartNo - 1 + i);
    if (i === 0) {
      drawTitleWithUnderline(doc, "Table of Contents", 58, 108, V0006.blue);
      y = startYFirst;
    } else {
      y = startYNext;
    }
  }

  switchToTocPage(0);

  for (const it of tocEntries || []) {
    const isChapter = it.level === 0;
    const indent = (it.level || 0) * 18;

    const fontSize = isChapter ? 12 : 11;
    const lineH = isChapter ? 22 : 20;

    if (y + lineH > bottomY) {
      pageIdx += 1;
      if (pageIdx >= tocPageCount) break;
      switchToTocPage(pageIdx);
    }

    const noStr = String(it.no || "");
    const titleStrRaw = String(it.title || "");
    const pageStr = String(it.page ?? "");

    const xNum = baseNumX + indent;
    const xTitle = baseTitleX + indent;

    doc.fillColor(V0006.blue).font("Helvetica-Bold").fontSize(fontSize);

    doc.text(pageStr, xPage, y, { width: pageBoxW, align: "right", lineBreak: false });
    doc.text(noStr, xNum, y, { width: wNum, align: "left", lineBreak: false });

    const maxTitleW = xPage - 10 - xTitle;
    const titleStr = ellipsisToWidth(doc, titleStrRaw, maxTitleW);
    doc.text(titleStr, xTitle, y, { width: maxTitleW, lineBreak: false });

    const titleW = doc.widthOfString(titleStr);
    const dotStartX = xTitle + titleW + 10;
    const dotEndX = xPage - 8;
    if (dotEndX > dotStartX + 10) {
      const dotW = doc.widthOfString(".");
      const dotsSpace = Math.max(0, dotEndX - dotStartX);
      const dotCount = Math.floor(dotsSpace / dotW);
      if (dotCount > 0) doc.text(".".repeat(dotCount), dotStartX, y, { lineBreak: false });
    }

    const dest = it.dest || it.destination || "";
    if (dest) addInternalLinkSafe(doc, xLeft, y - 1, right - xLeft, lineH, dest);

    y += lineH;
  }
}

/* =========================
 * v0006 outline / plan
 * ========================= */
const V0006_OUTLINE = [
  {
    chapterNo: 1,
    title: "Configuration & Utilities",
    tplKey: "config",
    key: "CFG",
    children: [
      { no: "1.1", key: "DUT_LIST", title: "DUT List" },
      { no: "1.2", key: "UTIL_LIST", title: "Utilities List" },
      { no: "1.3", key: "ACC_LIST", title: "List of Supported Devices & Accessories" },
      { no: "1.4", key: "APPEARANCE", title: "Appearance of Assembled System" },
    ],
  },
  {
    chapterNo: 2,
    title: "Hardware Functions",
    tplKey: "body",
    key: "HW",
    children: [
      { no: "2.1", key: "CPU", title: "CPU" },
      { no: "2.2", key: "MEM", title: "Memory" },
      { no: "2.3", key: "USB", title: "USB" },
      { no: "2.4", key: "SSD", title: "SSD" },
      { no: "2.5", key: "NVMe", title: "NVMe" },
      { no: "2.6", key: "NET", title: "Network" },
      { no: "2.7", key: "POE", title: "POE" },
      { no: "2.8", key: "WLS", title: "Wireless" },
      { no: "2.9", key: "SP", title: "Serial Ports" },
      { no: "2.10", key: "TPM", title: "TPM" },
      { no: "2.11", key: "GPIO", title: "GPIO" },
      { no: "2.12", key: "BUT", title: "Button" },
      { no: "2.13", key: "LED", title: "LEDs" },
      { no: "2.14", key: "WDT", title: "Watchdog Timer" },
      { no: "2.15", key: "RTC", title: "RTC Timer" },
      { no: "2.16", key: "AVoIP", title: "AVoIP" },
    ],
  },
  {
    chapterNo: 3,
    title: "Performance",
    tplKey: "body",
    key: "Perf",
    children: [
      { no: "3.1", key: "3DMark", title: "3DMark" },
      { no: "3.2", key: "CineB", title: "CineBench" },
      { no: "3.3", key: "AIDA", title: "AIDA64" },
      { no: "3.4", key: "PASSM", title: "PassMark Performance" },
      { no: "3.5", key: "CDM", title: "CrystalDiskMark" },
    ],
  },
  {
    chapterNo: 4,
    title: "Reliability",
    tplKey: "body",
    key: "Reli",
    children: [
      { no: "4.1", key: "TAT", title: "BurnInTest under Ambient Temperature" },
      { no: "4.2", key: "TST", title: "BurnInTest under Specific Temperature" },
      { no: "4.3", key: "TCT", title: "Thermal Cycling Test" },
    ],
  },
  {
    chapterNo: 5,
    title: "Stability",
    tplKey: "body",
    key: "Stab",
    children: [
      { no: "5.1", key: "PME", title: "Torture Test CPU with Prime95" },
      { no: "5.2", key: "MPT", title: "Memory Pattern Test" },
      { no: "5.3", key: "POR", title: "Power ON/OFF & Reboot Cycling Test" },
      { no: "5.4", key: "SSC", title: "Sleep State Cycling Test" },
    ],
  },
  {
    chapterNo: 6,
    title: "Power Consumption",
    tplKey: "body",
    key: "PWR",
    children: [
      { no: "6.1", key: "PCS", title: "Power Consumption of System" },
      { no: "6.2", key: "PCAS", title: "Power Consumption of AVoIP System" },
      { no: "6.3", key: "CPA", title: "Compatibility of Power Adapter" },
    ],
  },
  {
    chapterNo: 7,
    title: "Thermal Profile",
    tplKey: "body",
    key: "Thrm",
    children: [{ no: "7.1", key: "IRI", title: "IR Imaging" }],
  },
  {
    chapterNo: 8,
    title: "Electrostatic Discharge (ESD)",
    tplKey: "body",
    key: "ESD",
    children: [
      { no: "8.1", key: "CED", title: "Contact Discharge" },
      { no: "8.2", key: "AED", title: "Air Discharge" },
    ],
  },
  {
    chapterNo: 9,
    title: "Mechanical Protection",
    tplKey: "body",
    key: "MEP",
    children: [
      { no: "9.1", key: "IP6X", title: "IP6X Waterproof" },
      { no: "9.2", key: "Dro", title: "Drop" },
      { no: "9.3", key: "Vib", title: "Shock and Vibration" },
    ],
  },
];

function indexGroupSectionsByKey(group) {
  const m = new Map();
  for (const s of group?.sections || []) {
    const k = normalizeSectionKey(s.sectionKey || s.sectionTitle || s.section || "");
    if (!m.has(k)) m.set(k, s);
  }
  return m;
}

function buildV0006Plan(data, { showEmpty = false, catsOrder = [] } = {}) {
  const catGroups = new Map((data?.groups || []).map((g) => [normalizeCategory(g.category), g]));

  const cfgCh = V0006_OUTLINE.find((x) => x.chapterNo === 1);
  const rest = V0006_OUTLINE.filter((x) => x.chapterNo !== 1);

  const outlineByKey = new Map(rest.map((ch) => [normalizeCategory(ch.key), ch]));
  const orderKeys =
    Array.isArray(catsOrder) && catsOrder.length ? catsOrder.map((x) => normalizeCategory(x)) : rest.map((ch) => normalizeCategory(ch.key));

  const orderedOutline = [];
  const usedKey = new Set();
  for (const k of orderKeys) {
    const hit = outlineByKey.get(k);
    if (!hit) continue;
    const kk = normalizeCategory(hit.key);
    if (usedKey.has(kk)) continue;
    usedKey.add(kk);
    orderedOutline.push(hit);
  }

  const chapters = [];

  if (cfgCh) {
    chapters.push({
      ...cfgCh,
      chapterNo: 1,
      sections: (cfgCh.children || []).map((c, i) => ({ ...c, no: `1.${i + 1}`, data: null, hasAnySection: true })),
      hasAnySection: true,
    });
  }

  let nextChapNo = 2;

  for (const ch of orderedOutline) {
    const g = catGroups.get(normalizeCategory(ch.key));
    const secMap = indexGroupSectionsByKey(g);
    const used = new Set();
    const sections = [];

    const children = Array.isArray(ch.children) ? ch.children : [];
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      const secKey = normalizeSectionKey(c.key);
      const hit = secMap.get(secKey);
      const no = `${nextChapNo}.${i + 1}`;

      if (hit && (showEmpty || (hit.total || 0) > 0)) {
        used.add(secKey);
        sections.push({ ...c, no, data: hit });
      } else if (showEmpty) {
        sections.push({ ...c, no, data: null });
      }
    }

    let extraIdx = children.length + 1;
    for (const [k, s] of secMap.entries()) {
      if (used.has(k)) continue;
      if (!s || (!showEmpty && (s.total || 0) <= 0)) continue;

      sections.push({
        no: `${nextChapNo}.${extraIdx++}`,
        key: String(k),
        title: s.sectionTitle || s.section || String(k),
        data: s,
        isExtra: true,
      });
    }

    if (!sections.length) continue;

    chapters.push({ ...ch, chapterNo: nextChapNo, sections, hasAnySection: true });
    nextChapNo += 1;
  }

  const tocPlanEntries = [];
  for (const ch of chapters) {
    tocPlanEntries.push({ level: 0, no: `${ch.chapterNo}.`, title: ch.title });
    for (const s of ch.sections || []) tocPlanEntries.push({ level: 1, no: s.no, title: s.title });
  }

  return { chapters, tocPlanEntries };
}

/* =========================
 * Chapter 1 config render
 * ========================= */
function asArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    const p = parseJsonMaybe(v);
    if (Array.isArray(p)) return p;
  }
  if (typeof v === "object") {
    const a = v.items || v.list || v.rows || v.data || v.value || v.values || v.duts || v.utils || v.accessories;
    return Array.isArray(a) ? a : [];
  }
  return [];
}
function pickCfgBlock(cfg, keys) {
  const roots = [cfg, cfg?.dashboard, cfg?.configuration, cfg?.config, cfg?.chapter1, cfg?.CFG, cfg?.v0006].filter(Boolean);
  for (const root of roots) {
    for (const k of keys) {
      if (!root || typeof root !== "object") continue;
      if (root[k] !== undefined && root[k] !== null) return root[k];
    }
  }
  return null;
}
function normalizeListItems(list) {
  const arr = asArray(list);
  return arr.map((it) => {
    if (it === null || it === undefined) return {};
    if (typeof it === "string") return { name: it };
    if (typeof it !== "object") return { name: String(it) };
    return it;
  });
}
function drawNA(doc, text = "N/A") {
  doc.fillColor("#666").font("Helvetica").fontSize(10);
  doc.text(text, LAYOUT.left, doc.y, { width: LAYOUT.right - LAYOUT.left });
  doc.fillColor("#000");
  doc.moveDown(0.8);
}
function drawSimpleTable(doc, { cols, rows, x = LAYOUT.left, w = LAYOUT.right - LAYOUT.left, headerH = 20, minRowH = 18 }) {
  const lineGap = 2;
  const tableW = w;
  const x0 = x;

  ensureSpace(doc, headerH + 6, LAYOUT.bottomMargin);
  let y = doc.y;

  rectFillStroke(doc, x0, y, tableW, headerH, V0006.lightBlue, V0006.lineBlue, 1);

  const colXs = [x0];
  for (const c of cols) colXs.push(colXs[colXs.length - 1] + c.w);

  doc.fillColor(V0006.blue).font("Helvetica-Bold").fontSize(9);
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    const cx = colXs[i];
    doc.text(String(c.title || ""), cx + 4, y + 5, { width: c.w - 8, lineBreak: false });
  }

  doc.font("Helvetica").fontSize(9).fillColor("#000");

  for (const r of rows) {
    let h = minRowH;

    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      const val = r?.[c.key];
      const txt = clean(val ?? "");
      if (!txt) continue;
      const hh = doc.heightOfString(txt, { width: c.w - 8, lineGap });
      h = Math.max(h, hh + 6);
    }

    ensureSpace(doc, h + 6, LAYOUT.bottomMargin);
    y = doc.y;

    doc.save();
    doc.lineWidth(1).strokeColor(V0006.lineBlue);
    doc.rect(x0, y, tableW, h).stroke();
    for (let i = 1; i < colXs.length - 1; i++) doc.moveTo(colXs[i], y).lineTo(colXs[i], y + h).stroke();
    doc.restore();

    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      const cx = colXs[i];
      const val = r?.[c.key];
      const txt = clean(val ?? "");
      doc.fillColor(txt ? "#000" : "#666");
      doc.text(txt || "N/A", cx + 4, y + 3, { width: c.w - 8, lineGap });
    }
    doc.fillColor("#000");
    doc.y = y + h;
  }

  doc.moveDown(0.6);
}
async function drawAppearanceImages(doc, images, cache) {
  const left = LAYOUT.left;
  const maxW = LAYOUT.right - left;

  const arr = asArray(images).filter(Boolean);
  if (!arr.length) {
    drawNA(doc, "N/A (You can place assembled system photos here.)");
    return;
  }

  for (let i = 0; i < arr.length; i++) {
    const src = arr[i];
    const buf = await loadImageBufferFromAny(src, cache);

    ensureSpace(doc, 18, LAYOUT.bottomMargin);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#000");
    doc.text(`Photo ${i + 1}`, left, doc.y, { width: maxW });
    doc.moveDown(0.2);

    if (!buf) {
      doc.font("Helvetica").fontSize(9).fillColor("#666");
      doc.text(`(Image not found) ${String(src)}`, left, doc.y, { width: maxW });
      doc.fillColor("#000");
      doc.moveDown(0.6);
      continue;
    }

    const bottom = doc.page.height - LAYOUT.bottomMargin;
    let remainH = bottom - doc.y;
    if (remainH < 120) {
      doc._v0006AddPage?.();
      remainH = (doc.page.height - LAYOUT.bottomMargin) - doc.y;
    }

    const capH = Math.min(360, Math.max(120, remainH));
    try {
      const img = typeof doc.openImage === "function" ? doc.openImage(buf) : null;
      const iw = Number(img?.width || 1);
      const ih = Number(img?.height || 1);
      const scale = Math.min(maxW / iw, capH / ih, 1);
      const w = iw * scale;
      const h = ih * scale;

      doc.image(buf, left, doc.y, { width: w, height: h });
      doc.y = doc.y + h + 10;
    } catch {
      doc.font("Helvetica").fontSize(9).fillColor("#666");
      doc.text(`(Image embed failed) ${String(src)}`, left, doc.y, { width: maxW });
      doc.fillColor("#000");
      doc.moveDown(0.6);
    }
  }
}

/* =========================
 * Section/card render helpers
 * ========================= */
function drawV0006ChapterTitle(doc, chapterNo, title, destName) {
  const x = LAYOUT.left;
  const y = Math.max(doc.y, 92);
  doc.y = y;
  addNamedDestinationSafe(doc, destName);
  drawTitleWithUnderline(doc, `${chapterNo}. ${title}`, x, y, V0006.blue);
  doc.y = y + 40;
}

function drawV0006SectionBar(doc, text, destName) {
  const left = LAYOUT.left;
  const right = LAYOUT.right;
  const w = right - left;

  ensureSpace(doc, 20, LAYOUT.bottomMargin);
  const y = doc.y;

  doc.y = y;
  addNamedDestinationSafe(doc, destName);

  doc.save();
  doc.fillColor(V0006.blue).font("Helvetica-Bold").fontSize(11);
  doc.text(text, left, y, { width: w, lineBreak: false });
  doc.restore();

  doc.y = y + 20;
}

function getV0006TestItemBox(doc, row) {
  const left = LAYOUT.left;
  const right = LAYOUT.right;
  const width = right - left;

  const labelW = 92;
  const resultLabelW = 62;
  const resultValueW = 80;

  const contentW = width - labelW;
  const remarkContentW = width - labelW - resultLabelW - resultValueW;
  const lineGap = 2;

  const tcCode = clean(row?.tcCode);
  const tcBodyText = clean(row?.testCase) || "N/A";
  const tcPlainText = tcCode ? `${tcCode}: ${tcBodyText}` : tcBodyText;

  const procedureText = showNA(row?.procedureText);
  const criteriaText = showNA(row?.criteriaText);
  const remarkTextRaw = clean(row?.remarkText);
  const remarkText = keepLine(remarkTextRaw);
  const resultText = String(row?.resultLabel || "Untested");

  const measureWidgets = Array.isArray(row?.measureWidgets) ? row.measureWidgets : [];

  const widgetLabelW = 90;
  const widgetAvgW = 105;
  const widgetTempW = 60;
  const widgetUnitW = 30;
  const widgetSpecW = width - widgetLabelW - widgetAvgW - widgetTempW - widgetUnitW;

  doc.save();
  doc.font("Helvetica").fontSize(10);

  const tcH = doc.heightOfString(tcPlainText, { width: contentW - 14, lineGap });
  const procH = doc.heightOfString(procedureText, { width: contentW - 14, lineGap });
  const critH = doc.heightOfString(criteriaText, { width: contentW - 14, lineGap });
  const remarkH = doc.heightOfString(remarkText, { width: remarkContentW - 14, lineGap });
  const resultH = doc.heightOfString(resultText, {
    width: resultValueW - 10,
    align: "center",
    lineGap,
  });

  const widgetRowHeights = measureWidgets.map((it) => {
    const specText = clean(it?.spec) || "empty";
    const tempText = clean(it?.temp) || "";
    const specH = doc.heightOfString(specText, { width: widgetSpecW - 14, lineGap });
    const tempH = doc.heightOfString(tempText, { width: widgetTempW - 10, align: "center", lineGap });
    return Math.max(24, specH + 10, tempH + 10);
  });

  doc.restore();

  const testCaseRowH = Math.max(28, tcH + 10);
  const procedureRowH = Math.max(26, procH + 10);
  const criteriaRowH = Math.max(26, critH + 10);
  const measureWidgetsH = widgetRowHeights.reduce((sum, h) => sum + h, 0);
  const remarkRowH = Math.max(30, remarkH + 10, resultH + 10);

  const boxH = testCaseRowH + procedureRowH + criteriaRowH + measureWidgetsH + remarkRowH;
  const imgs = Array.isArray(row?.images) ? row.images : [];
  const imgNeed = imgs.length ? imgs.length * (220 + 16) : 0;

  return {
    left,
    right,
    width,
    labelW,
    resultLabelW,
    resultValueW,
    contentW,
    remarkContentW,
    lineGap,
    tcCode,
    tcBodyText,
    procedureText,
    criteriaText,
    remarkTextRaw,
    remarkText,
    resultText,
    measureWidgets,
    widgetLabelW,
    widgetSpecW,
    widgetAvgW,
    widgetTempW,
    widgetUnitW,
    widgetRowHeights,
    testCaseRowH,
    procedureRowH,
    criteriaRowH,
    measureWidgetsH,
    remarkRowH,
    boxH,
    imgNeed,
  };
}

function measureV0006TestItemCard(doc, row) {
  const box = getV0006TestItemBox(doc, row);
  return {
    total: box.boxH + box.imgNeed + 12,
    keepMin: box.boxH + 12,
    tcOnly: box.testCaseRowH + 12,
  };
}

function v0006MaxBodyHeight(doc) {
  return doc.page.height - LAYOUT.bottomMargin - LAYOUT.topY;
}
function pickKeepNeedForTcBlock(doc, m) {
  const maxH = v0006MaxBodyHeight(doc);
  if (m.total <= maxH) return m.total;
  if (m.keepMin <= maxH) return m.keepMin;
  return Math.min(m.tcOnly + 24, maxH);
}

function drawV0006LabelCell(doc, x, y, w, h, text, fillColor = null) {
  rectFillStroke(doc, x, y, w, h, fillColor, V0006.lineBlue, 1);
  doc.fillColor("#000").font("Helvetica-Bold").fontSize(10);
  doc.text(text, x + 10, y + 7, {
    width: w - 20,
    height: h - 10,
  });
}

function drawV0006TextCell(doc, x, y, w, h, text, opts = {}) {
  const {
    color = "#000",
    font = "Helvetica",
    fontSize = 10,
    align = "left",
    lineGap = 2,
  } = opts;

  doc.save();
  doc.lineWidth(1).strokeColor(V0006.lineBlue).rect(x, y, w, h).stroke();
  doc.fillColor(color).font(font).fontSize(fontSize);
  doc.text(text, x + 10, y + 6, {
    width: w - 14,
    height: h - 10,
    align,
    lineGap,
  });
  doc.restore();
}

function drawV0006ResultValueCell(doc, x, y, w, h, row) {
  const resultText = String(row?.resultLabel || "Untested");
  const rc =
    row?.result === "pass"
      ? V0006.pass
      : row?.result === "fail"
        ? V0006.fail
        : V0006.pending;

  doc.save();
  doc.lineWidth(1).strokeColor(V0006.lineBlue).rect(x, y, w, h).stroke();
  doc.fillColor(rc).font("Helvetica-Bold").fontSize(10);
  doc.text(resultText, x + 4, y + 7, {
    width: w - 8,
    height: h - 10,
    align: "center",
  });
  doc.restore();
}

/* ---------------------------
      專門畫measurement row
   --------------------------- */

function drawV0006StrokeCell(doc, x, y, w, h) {
  doc.save();
  doc.lineWidth(1).strokeColor(V0006.lineBlue).rect(x, y, w, h).stroke();
  doc.restore();
}

function drawV0006MeasureWidgetRow(doc, box, y, it, rowH) {
  const widgetFill = "#dfeecf";

  const x0 = box.left;
  const x1 = x0 + box.widgetLabelW;
  const x2 = x1 + box.widgetSpecW;
  const x3 = x2 + box.widgetAvgW;
  const x4 = x3 + box.widgetTempW;

  const labelText = clean(it?.label) || "Item";
  const specText = clean(it?.spec) || "empty";
  const tempText = clean(it?.temp) || "";

  // label
  rectFillStroke(doc, x0, y, box.widgetLabelW, rowH, widgetFill, V0006.lineBlue, 1);
  doc.fillColor("#000").font("Helvetica-Bold").fontSize(10);
  doc.text(labelText, x0 + 6, y + 7, {
    width: box.widgetLabelW - 12,
    height: rowH - 10,
    align: "center",
  });

  // spec
  drawV0006TextCell(doc, x1, y, box.widgetSpecW, rowH, specText, {
    color: specText === "empty" ? "#666" : "#000",
    lineGap: box.lineGap,
  });

  // average temp
  rectFillStroke(doc, x2, y, box.widgetAvgW, rowH, widgetFill, V0006.lineBlue, 1);
  doc.fillColor("#000").font("Helvetica-Bold").fontSize(10);
  doc.text("Average Temp.", x2 + 6, y + 7, {
    width: box.widgetAvgW - 12,
    height: rowH - 10,
    align: "center",
  });

  // temp value
  drawV0006TextCell(doc, x3, y, box.widgetTempW, rowH, tempText, {
    color: tempText ? "#000" : "#666",
    align: "center",
    lineGap: box.lineGap,
  });

  // unit
  drawV0006StrokeCell(doc, x4, y, box.widgetUnitW, rowH);
  doc.fillColor("#000").font("Helvetica-Bold").fontSize(10);
  doc.text("°C", x4, y + 7, {
    width: box.widgetUnitW,
    height: rowH - 10,
    align: "center",
  });
}

/* ---------------------------
      專門畫measurement row
   --------------------------- */

async function drawV0006ItemImages(doc, row, cache) {
  const left = LAYOUT.left;
  const maxW = LAYOUT.right - left;
  const imgs = Array.isArray(row?.images) ? row.images : [];

  if (!imgs.length) return;
  doc.moveDown(0.25);

  for (const u of imgs) {
    const buf = await loadImageBufferFromAny(u, cache);

    if (!buf) {
      ensureSpace(doc, 16, LAYOUT.bottomMargin);
      doc.font("Helvetica").fontSize(8).fillColor("#666");
      doc.text(`(Image not found) ${u}`, left, doc.y, { width: maxW });
      doc.fillColor("#000");
      doc.moveDown(0.3);
      continue;
    }

    const bottom = doc.page.height - LAYOUT.bottomMargin;
    let remainH = bottom - doc.y;

    if (remainH < 120) {
      doc._v0006AddPage?.();
      remainH = (doc.page.height - LAYOUT.bottomMargin) - doc.y;
    }

    const capH = Math.min(260, Math.max(120, remainH));

    try {
      const img = typeof doc.openImage === "function" ? doc.openImage(buf) : null;
      const iw = Number(img?.width || 1);
      const ih = Number(img?.height || 1);
      const scale = Math.min(maxW / iw, capH / ih, 1);

      const w = Math.max(1, iw * scale);
      const h = Math.max(1, ih * scale);

      doc.image(buf, left, doc.y, { width: w, height: h });
      doc.y += h + 8;
    } catch {
      ensureSpace(doc, 16, LAYOUT.bottomMargin);
      doc.font("Helvetica").fontSize(8).fillColor("#666");
      doc.text(`(Image embed failed) ${u}`, left, doc.y, { width: maxW });
      doc.fillColor("#000");
      doc.moveDown(0.3);
    }
  }
}

async function drawV0006TestItemCard(doc, row, cache) {
  const box = getV0006TestItemBox(doc, row);
  ensureSpace(doc, box.boxH + 8, LAYOUT.bottomMargin);

  const greenFill = "#cfe1b9";
  const whiteFill = "#ffffff";
  let y = doc.y;

  drawV0006LabelCell(doc, box.left, y, box.labelW, box.testCaseRowH, "Test Case", V0006.lightBlue);

  doc.save();
  doc.lineWidth(1).strokeColor(V0006.lineBlue).rect(box.left + box.labelW, y, box.contentW, box.testCaseRowH).stroke();
  doc.fontSize(10);
  if (box.tcCode) {
    doc.fillColor(V0006.blue2).font("Helvetica-Oblique");
    doc.text(`${box.tcCode}: `, box.left + box.labelW + 10, y + 6, {
      width: box.contentW - 14,
      continued: true,
      lineGap: box.lineGap,
    });
    doc.fillColor("#000").font("Helvetica");
    doc.text(box.tcBodyText, {
      width: box.contentW - 14,
      lineGap: box.lineGap,
    });
  } else {
    doc.fillColor("#000").font("Helvetica");
    doc.text(box.tcBodyText, box.left + box.labelW + 10, y + 6, {
      width: box.contentW - 14,
      lineGap: box.lineGap,
    });
  }
  doc.restore();

  y += box.testCaseRowH;

  drawV0006LabelCell(doc, box.left, y, box.labelW, box.procedureRowH, "Procedure", whiteFill);
  drawV0006TextCell(doc, box.left + box.labelW, y, box.contentW, box.procedureRowH, box.procedureText, {
    color: box.procedureText === "N/A" ? "#666" : "#000",
    lineGap: box.lineGap,
  });
  y += box.procedureRowH;

  drawV0006LabelCell(doc, box.left, y, box.labelW, box.criteriaRowH, "Criteria", whiteFill);
  drawV0006TextCell(doc, box.left + box.labelW, y, box.contentW, box.criteriaRowH, box.criteriaText, {
    color: box.criteriaText === "N/A" ? "#666" : "#000",
    lineGap: box.lineGap,
  });
  y += box.criteriaRowH;

  // ✅ Measurement Widgets：只畫 enabled !== false 的列
  if (box.measureWidgets.length) {
    for (let i = 0; i < box.measureWidgets.length; i++) {
      const it = box.measureWidgets[i];
      const rowH = box.widgetRowHeights[i] || 24;
      drawV0006MeasureWidgetRow(doc, box, y, it, rowH);
      y += rowH;
    }
  }

  drawV0006LabelCell(doc, box.left, y, box.labelW, box.remarkRowH, "Remark", greenFill);
  drawV0006TextCell(doc, box.left + box.labelW, y, box.remarkContentW, box.remarkRowH, box.remarkText, {
    color: box.remarkTextRaw ? "#000" : "#666",
    lineGap: box.lineGap,
  });
  drawV0006LabelCell(doc, box.left + box.labelW + box.remarkContentW, y, box.resultLabelW, box.remarkRowH, "Result", greenFill);
  drawV0006ResultValueCell(
    doc,
    box.left + box.labelW + box.remarkContentW + box.resultLabelW,
    y,
    box.resultValueW,
    box.remarkRowH,
    row
  );

  doc.y = y + box.remarkRowH + 6;
  await drawV0006ItemImages(doc, row, cache);
}

async function renderConfigChapterV0006(doc, { tocEntries, getPageNo, meta, cache }) {
  const cfg = getReportMetaConfig(meta);

  const chDest = makeDestName("ch", "1");
  drawV0006ChapterTitle(doc, 1, "Configuration & Utilities", chDest);
  tocEntries.push({ level: 0, no: "1.", title: "Configuration & Utilities", page: getPageNo(), dest: chDest });

  {
    const b = { no: "1.1", title: "DUT List" };
    const dest = makeDestName("sec", b.no);
    drawV0006SectionBar(doc, `${b.no} ${b.title}`, dest);
    tocEntries.push({ level: 1, no: b.no, title: b.title, page: getPageNo(), dest });

    const dutBlock = pickCfgBlock(cfg, ["dutList", "dut_list", "duts", "dut"]);
    const dutItems = normalizeListItems(dutBlock);

    if (!dutItems.length) {
      drawNA(doc);
    } else {
      const rows = dutItems.map((it, idx) => ({
        no: String(it.no ?? it.index ?? (idx + 1)),
        model: clean(it.model ?? it.modelName ?? it.systemModel ?? it.name ?? it.dut ?? it.title),
        sn: clean(it.sn ?? it.serial ?? it.serialNumber ?? it.sN),
        cpu: clean(it.cpu ?? it.cpuConfig ?? it.processor),
        memory: clean(it.memory ?? it.mem ?? it.memoryConfig),
        storage: clean(it.storage ?? it.disk ?? it.ssd ?? it.hdd ?? it.diskConfig),
      }));

      drawSimpleTable(doc, {
        cols: [
          { key: "no", title: "No.", w: 34 },
          { key: "model", title: "Model / DUT", w: 150 },
          { key: "sn", title: "S/N", w: 90 },
          { key: "cpu", title: "CPU", w: 95 },
          { key: "memory", title: "Memory", w: 60 },
          { key: "storage", title: "Storage", w: (LAYOUT.right - LAYOUT.left) - (34 + 150 + 90 + 95 + 60) },
        ],
        rows,
      });
    }
  }

  {
    const b = { no: "1.2", title: "Utilities List" };
    const dest = makeDestName("sec", b.no);
    drawV0006SectionBar(doc, `${b.no} ${b.title}`, dest);
    tocEntries.push({ level: 1, no: b.no, title: b.title, page: getPageNo(), dest });

    const utilBlock = pickCfgBlock(cfg, ["utilitiesList", "utilities", "utilList", "utils", "utility"]);
    const utilItems = normalizeListItems(utilBlock);

    if (!utilItems.length) {
      drawNA(doc);
    } else {
      const rows = utilItems.map((it, idx) => ({
        no: String(it.no ?? it.index ?? (idx + 1)),
        name: clean(it.name ?? it.utility ?? it.title ?? it.tool),
        version: clean(it.version ?? it.ver),
        source: clean(it.source ?? it.vendor ?? it.url ?? it.link ?? it.from),
        note: clean(it.note ?? it.remark ?? it.remarks ?? it.desc ?? it.description),
      }));

      drawSimpleTable(doc, {
        cols: [
          { key: "no", title: "No.", w: 34 },
          { key: "name", title: "Utility", w: 160 },
          { key: "version", title: "Version", w: 70 },
          { key: "source", title: "Source / Vendor", w: 140 },
          { key: "note", title: "Note", w: (LAYOUT.right - LAYOUT.left) - (34 + 160 + 70 + 140) },
        ],
        rows,
      });
    }
  }

  {
    const b = { no: "1.3", title: "List of Supported Devices & Accessories" };
    const dest = makeDestName("sec", b.no);
    drawV0006SectionBar(doc, `${b.no} ${b.title}`, dest);
    tocEntries.push({ level: 1, no: b.no, title: b.title, page: getPageNo(), dest });

    const accBlock = pickCfgBlock(cfg, ["accessories", "accessoriesList", "supportedDevices", "supportedDeviceList", "devices", "deviceList"]);
    const accItems = normalizeListItems(accBlock);

    if (!accItems.length) {
      drawNA(doc);
    } else {
      const rows = accItems.map((it, idx) => ({
        no: String(it.no ?? it.index ?? (idx + 1)),
        item: clean(it.item ?? it.name ?? it.device ?? it.title),
        spec: clean(it.spec ?? it.model ?? it.partNo ?? it.pn ?? it.partNumber),
        note: clean(it.note ?? it.remark ?? it.remarks ?? it.desc ?? it.description),
      }));

      drawSimpleTable(doc, {
        cols: [
          { key: "no", title: "No.", w: 34 },
          { key: "item", title: "Item", w: 210 },
          { key: "spec", title: "Model / P/N", w: 140 },
          { key: "note", title: "Note", w: (LAYOUT.right - LAYOUT.left) - (34 + 210 + 140) },
        ],
        rows,
      });
    }
  }

  {
    const b = { no: "1.4", title: "Appearance of Assembled System" };
    const dest = makeDestName("sec", b.no);
    drawV0006SectionBar(doc, `${b.no} ${b.title}`, dest);
    tocEntries.push({ level: 1, no: b.no, title: b.title, page: getPageNo(), dest });

    const appearanceBlock = pickCfgBlock(cfg, [
      "appearanceImages",
      "appearance",
      "appearancePhotos",
      "assembledSystemImages",
      "assembledPhotos",
      "photos",
      "images",
    ]);

    await drawAppearanceImages(doc, asArray(appearanceBlock), cache);
  }
}

async function renderV0006Section(doc, sec, { tocEntries, getPageNo, cache }) {
  const sData = sec.data;

  if (sData?.rows?.length) {
    const mFirst = measureV0006TestItemCard(doc, sData.rows[0]);
    const keepFirst = Math.min(pickKeepNeedForTcBlock(doc, mFirst), mFirst.keepMin);

    const baseNeed = 28 + 12;
    const bottom = doc.page.height - LAYOUT.bottomMargin;
    const remain = bottom - doc.y;

    const needFull = baseNeed + keepFirst;
    const needMin = baseNeed + mFirst.tcOnly;

    if (doc.y <= 140 && needFull > remain && needMin <= remain) ensureSpace(doc, needMin, LAYOUT.bottomMargin);
    else ensureSpace(doc, needFull, LAYOUT.bottomMargin);
  } else {
    ensureSpace(doc, 28 + 16, LAYOUT.bottomMargin);
  }

  const secDest = makeDestName("sec", sec.no);
  drawV0006SectionBar(doc, `${sec.no} ${sec.title}`, secDest);
  tocEntries.push({ level: 1, no: sec.no, title: sec.title, page: getPageNo(), dest: secDest });

  if (!sData || (sData.total || 0) === 0) {
    doc.fillColor("#666").font("Helvetica").fontSize(10);
    doc.text("No test cases.", LAYOUT.left, doc.y, { width: LAYOUT.right - LAYOUT.left });
    doc.fillColor("#000");
    doc.moveDown(0.8);
    return;
  }

  const rowsArr = Array.isArray(sData.rows) ? sData.rows : [];

  for (let idx = 0; idx < rowsArr.length; idx++) {
    const r = rowsArr[idx];
    const m = measureV0006TestItemCard(doc, r);
    let keepNeed = pickKeepNeedForTcBlock(doc, { ...m, total: m.keepMin });

    const bottom = doc.page.height - LAYOUT.bottomMargin;
    const remain = bottom - doc.y;
    if (m.total > remain && m.keepMin <= remain) keepNeed = m.keepMin;

    ensureSpace(doc, keepNeed, LAYOUT.bottomMargin);
    await drawV0006TestItemCard(doc, r, cache);
    doc.moveDown(0.35);
  }

  doc.moveDown(0.5);
}

async function renderV0006Chapter(doc, ch, ctx) {
  if (ch.chapterNo === 1) {
    await renderConfigChapterV0006(doc, ctx);
    doc._v0006TplKey = "body";
    return;
  }

  const chDest = makeDestName("ch", String(ch.chapterNo));
  drawV0006ChapterTitle(doc, ch.chapterNo, ch.title, chDest);
  ctx.tocEntries.push({ level: 0, no: `${ch.chapterNo}.`, title: ch.title, page: ctx.getPageNo(), dest: chDest });

  for (const sec of ch.sections || []) {
    await renderV0006Section(doc, sec, ctx);
  }
}

/* =========================
 * Auth helpers
 * ========================= */
function verifyTokenFromQuery(req, _res, next) {
  if (req.user) return next();
  const raw = req.query?.token;
  if (!raw) return next();
  try {
    req.user = jwt.verify(raw, process.env.JWT_SECRET || "");
  } catch {}
  next();
}
function authEither(req, res, next) {
  if (req.user) return next();
  return authMiddleware(req, res, next);
}

/* =========================
 * Route
 * ========================= */
router.get(
  ["/products/:id", "/product/:id", "/products/:id.pdf", "/product/:id.pdf"],
  verifyTokenFromQuery,
  authEither,
  async (req, res) => {
    let doc = null;

    try {
      const raw = String(req.params.id || "");
      const productId = Number(raw.replace(/\.pdf$/i, ""));
      if (!Number.isFinite(productId) || productId <= 0) {
        return res.status(400).json({ success: false, message: "Bad product id" });
      }

      const data = await fetchReportData(productId, req.query || {});

      const reportMetaRow = await ReportMeta?.findOne({ where: { productId } })
        .then((r) => (r ? r.toJSON() : null))
        .catch(() => null);

      const flags = getExportFlags(req, reportMetaRow);
      const metaQ = getReportMeta(data.product, req);
      const meta = { ...(reportMetaRow || {}), ...(metaQ || {}) };

      const sysName =
        clean(
          meta?.projectName ||
            meta?.systemModelName ||
            data.product?.systemModelName ||
            data.product?.modelName ||
            data.product?.model ||
            data.product?.name ||
            `Product_${productId}`
        ) || `Product_${productId}`;

      const rev =
        clean(
          meta?.revision ||
            data.product?.reportRevision ||
            data.product?.revision ||
            data.product?.rev ||
            data.product?.reportRev
        ) || "0.1";

      const fn = safeFilename(`${sysName} Test Report R${rev}_${yyyymmdd(new Date())}.pdf`);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fn}"`);

      doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
      doc.on("error", (e) => console.error("[report] pdfkit error:", e));
      doc.pipe(res);

      let currentPageNo = 1;
      doc.on("pageAdded", () => {
        try { currentPageNo += 1; } catch {}
      });
      const getPageNo = () => currentPageNo;

      const cache = { metaCache: new Map(), bufferCache: new Map() };
      const tplCache = new Map();

      const useTemplate = boolish(req.query?.template, false);
      const showEmpty = boolish(req.query?.showEmpty, false);

      const catsCsv = clean(req.query?.cats || "");
      const catsSet = catsCsv ? new Set(catsCsv.split(",").map((s) => normalizeCategory(s)).filter(Boolean)) : new Set();
      const catsOrder = catsCsv ? catsCsv.split(",").map((s) => normalizeCategory(s)).filter(Boolean) : [];

      if (useTemplate) await preloadTemplateBuffers(tplCache);

      doc._v0006TplKey = "body";
      doc._v0006AddPage = () => {
        doc.addPage();
        if (useTemplate) applyTemplateSync(doc, doc._v0006TplKey || "body", tplCache);
        doc.y = LAYOUT.topY;
      };

      if (useTemplate) applyTemplateSync(doc, "cover", tplCache);
      await drawCoverV0006(doc, { sysName, rev, product: data.product, req, cache, meta });

      if (flags.showSummary) {
        doc.addPage();
        if (useTemplate) applyTemplateSync(doc, "summary", tplCache);
        drawSummaryV0006(doc, {
          summary: data.summary || [],
          overall: data.overall || {},
          product: data.product,
          onlyCatsSet: catsSet.size ? catsSet : null
        });
      }

      const { chapters, tocPlanEntries } = buildV0006Plan(data, { showEmpty, catsOrder });

      const tocPageCount = estimateTocPagesFromEntriesCount(tocPlanEntries.length);
      doc.addPage();
      const tocStartNo = getPageNo();
      for (let i = 1; i < tocPageCount; i++) doc.addPage();

      if (useTemplate) {
        for (let i = 0; i < tocPageCount; i++) {
          doc.switchToPage(tocStartNo - 1 + i);
          applyTemplateSync(doc, "toc", tplCache);
        }
      }

      doc.addPage();
      doc.y = LAYOUT.topY;

      const tocEntries = [];

      if (useTemplate) {
        doc._v0006TplKey = "config";
        applyTemplateSync(doc, "config", tplCache);
      } else {
        doc._v0006TplKey = "body";
      }

      if (!chapters.length) {
        doc.font("Helvetica-Bold").fontSize(14).fillColor("#000");
        doc.text("No test cases found.", LAYOUT.left, doc.y, { width: LAYOUT.right - LAYOUT.left });
        doc.font("Helvetica").fontSize(10).fillColor("#666");
        doc.text("Check filters (kw/plan/result/cats/selected) or product testcases.", LAYOUT.left, doc.y + 20, {
          width: LAYOUT.right - LAYOUT.left
        });
        doc.fillColor("#000");
      } else {
        const ctx = { tocEntries, getPageNo, meta, cache };

        for (let ci = 0; ci < chapters.length; ci++) {
          const ch = chapters[ci];

          if (ci !== 0) {
            doc._v0006TplKey = ch.tplKey || "body";
            doc._v0006AddPage();
          } else {
            doc._v0006TplKey = ch.tplKey || "body";
          }

          await renderV0006Chapter(doc, ch, ctx);
        }
      }

      renderTocV0006(doc, tocEntries, tocStartNo, tocPageCount);

      const drawFooter = useTemplate ? boolish(req.query?.drawFooter, false) : true;
      decorateV0006(doc, { coverHasFooter: false, drawTopBand: !useTemplate, drawFooter });

      doc.end();
    } catch (err) {
      console.error("[report] generate failed:", err);

      try {
        if (doc) {
          try { doc.unpipe(res); } catch {}
          try { doc.destroy?.(); } catch {}
        }
      } catch {}

      try {
        if (!res.headersSent) return res.status(500).json({ success: false, message: err?.message || "Server error" });
        try { res.destroy(); } catch { try { res.end(); } catch {} }
      } catch {}
    }
  }
);

export default router;