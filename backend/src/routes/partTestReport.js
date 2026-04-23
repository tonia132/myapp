// backend/src/routes/partTestReport.js
import express from "express";
import PDFDocument from "pdfkit";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { Op } from "sequelize";

import * as models from "../models/index.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const { Product, TestCase, File, ReportMeta } = models;

/* =========================================================
 * 基本 helpers
 * ======================================================= */
const TRUE_SET = new Set(["1", "true", "yes", "y", "on", "checked", "check", "✓", "v", "x"]);
const FALSE_SET = new Set(["0", "false", "no", "n", "off", ""]);

function clean(v) {
  return String(v ?? "").trim();
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
  const b = triBool(v);
  return b === null ? def : b;
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
function yyyymmdd(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
function safeFilename(s) {
  return String(s || "")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}
function pctVal(numer, denom) {
  const a = Number(numer);
  const b = Number(denom);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return "0.0%";
  return `${((a / b) * 100).toFixed(1)}%`;
}
function parseDateLike(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}
function formatDateEn(dLike) {
  const d = dLike ? new Date(dLike) : new Date();
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

/* =========================================================
 * 上傳檔 / 圖片 helpers（沿用 x86 report.js 思路）
 * ======================================================= */
function guessUploadRoot() {
  const env = clean(process.env.UPLOAD_DIR || process.env.UPLOAD_ROOT || process.env.FILE_UPLOAD_DIR);
  if (env && fs.existsSync(env)) return env;

  const cands = [
    path.resolve(process.cwd(), "uploads"),
    path.resolve(process.cwd(), "public", "uploads"),
    path.resolve(process.cwd(), "backend", "uploads"),
    path.resolve(process.cwd(), "storage", "uploads"),
    path.resolve(process.cwd(), "../uploads"),
  ];

  for (const p of cands) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
    } catch {}
  }
  return path.resolve(process.cwd(), "uploads");
}

function resolveExistingPath(candidates = []) {
  for (const p of candidates) {
    if (!p) continue;
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch {}
  }
  return null;
}

function extractFileIdFromUrl(url) {
  const s = clean(url);
  if (!s) return 0;
  let m = s.match(/\/(?:api\/)?files\/(\d+)(?:\b|$)/i);
  if (m) return Number(m[1]) || 0;
  m = s.match(/[?&](?:fileId|id)=(\d+)(?:\b|$)/i);
  if (m) return Number(m[1]) || 0;
  return 0;
}

function resolveFileDiskPath(fileRec) {
  if (!fileRec) return null;
  const uploadRoot = guessUploadRoot();
  const candidates = [];

  const abs = clean(fileRec.path || fileRec.filePath || fileRec.absPath || fileRec.absolutePath);
  if (abs) candidates.push(abs);

  const stored = clean(
    fileRec.storedName || fileRec.savedName || fileRec.filename || fileRec.fileName || fileRec.diskName || fileRec.name
  );
  const folder = clean(fileRec.folder || fileRec.dir || fileRec.directory || fileRec.subdir || fileRec.category);
  if (stored) {
    if (folder) candidates.push(path.resolve(uploadRoot, folder, stored));
    candidates.push(path.resolve(uploadRoot, stored));
  }

  return resolveExistingPath(candidates);
}

function FileAny() {
  return File?.unscoped ? File.unscoped() : File;
}

async function loadImageBufferFromUrlOrFile(u, fileCache) {
  const url = clean(u);
  if (!url) return null;

  const fileId = extractFileIdFromUrl(url);
  if (fileId && File) {
    let rec = fileCache.get(`id:${fileId}`);
    if (rec === undefined) {
      rec = await FileAny().findByPk(fileId, { raw: true }).catch(() => null);
      fileCache.set(`id:${fileId}`, rec || null);
    }
    const disk = resolveFileDiskPath(rec);
    if (disk) {
      try {
        return await fs.promises.readFile(disk);
      } catch {}
    }
  }

  if (/^https?:\/\//i.test(url)) {
    try {
      const fetchFn = globalThis.fetch || (await import("node-fetch").then((m) => m.default).catch(() => null));
      if (!fetchFn) return null;
      const r = await fetchFn(url);
      if (!r.ok) return null;
      const ab = await r.arrayBuffer();
      return Buffer.from(ab);
    } catch {
      return null;
    }
  }

  return null;
}

async function loadImageBufferFromAny(src, fileCache) {
  if (!src) return null;
  if (Buffer.isBuffer(src)) return src;

  const s = String(src).trim();
  if (!s) return null;

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(s)) {
    try {
      const b64 = s.split(",")[1] || "";
      return b64 ? Buffer.from(b64, "base64") : null;
    } catch {
      return null;
    }
  }

  try {
    const maybeAbs = path.isAbsolute(s) ? s : path.resolve(process.cwd(), s);
    if (fs.existsSync(maybeAbs) && fs.statSync(maybeAbs).isFile()) return await fs.promises.readFile(maybeAbs);
  } catch {}

  if (/^\d+$/.test(s) && File) {
    const fileId = Number(s);
    let rec = fileCache.get(`id:${fileId}`);
    if (rec === undefined) {
      rec = await FileAny().findByPk(fileId, { raw: true }).catch(() => null);
      fileCache.set(`id:${fileId}`, rec || null);
    }
    const disk = resolveFileDiskPath(rec);
    if (disk) {
      try {
        return await fs.promises.readFile(disk);
      } catch {}
    }
  }

  const byUrl = await loadImageBufferFromUrlOrFile(s, fileCache);
  if (byUrl) return byUrl;

  if (File && /\.(png|jpe?g|webp)$/i.test(s)) {
    const cacheKey = `name:${s}`;
    let rec = fileCache.get(cacheKey);
    if (rec === undefined) {
      rec = await FileAny()
        .findOne({
          where: {
            [Op.or]: [
              hasAttr(File, "originalName") ? { originalName: s } : null,
              hasAttr(File, "displayName") ? { displayName: s } : null,
              hasAttr(File, "storedName") ? { storedName: s } : null,
              hasAttr(File, "filename") ? { filename: s } : null,
            ].filter(Boolean),
          },
          raw: true,
        })
        .catch(() => null);
      fileCache.set(cacheKey, rec || null);
    }
    const disk = resolveFileDiskPath(rec);
    if (disk) {
      try {
        return await fs.promises.readFile(disk);
      } catch {}
    }
  }

  return null;
}

/* =========================================================
 * v0006 視覺設定
 * ======================================================= */
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
function drawFooterV0006(doc, pageNo, totalPages) {
  const y = doc.page.height - 36;
  doc.save();
  doc.moveTo(40, y - 8).lineTo(doc.page.width - 40, y - 8).lineWidth(0.8).strokeColor(V0006.blue).stroke();
  doc.fillColor("#666").font("Helvetica").fontSize(8);
  doc.text(REPORT_COMPANY, 40, y, { width: 220, align: "left" });
  doc.text(`${REPORT_CONFIDENTIAL}`, 0, y, { width: doc.page.width, align: "center" });
  doc.text(`${pageNo} / ${totalPages || ""}`, doc.page.width - 120, y, { width: 80, align: "right" });
  doc.restore();
}
function ensureSpace(doc, need = 40, bottomGap = 70) {
  const bottom = doc.page.height - bottomGap;
  if (doc.y + need <= bottom) return false;
  doc.addPage();
  doc.y = 90;
  return true;
}
function addNamedDestinationSafe(doc, name) {
  try {
    if (name && typeof doc.addNamedDestination === "function") doc.addNamedDestination(name);
  } catch {}
}
function makeDestName(prefix, raw) {
  return `${prefix}_${String(raw || "").replace(/[^a-zA-Z0-9_\-]+/g, "_")}`;
}
function estimateTocPagesFromEntriesCount(n) {
  if (n <= 28) return 1;
  return Math.ceil(n / 28);
}
function renderTocV0006(doc, entries, startPageNo, pageCount) {
  for (let p = 0; p < pageCount; p++) {
    doc.switchToPage(startPageNo - 1 + p);
    drawTitleWithUnderline(doc, "Table of Contents", 58, 92, V0006.blue);
    doc.y = 140;

    const pageEntries = entries.slice(p * 28, (p + 1) * 28);
    for (const e of pageEntries) {
      const noText = clean(e.no);
      const title = clean(e.title);
      const indent = e.level === 1 ? 22 : 0;
      const baseX = 58 + indent;
      const y = doc.y;

      doc.font(e.level === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor("#000");
      doc.text(noText, baseX, y, { width: 42 });
      doc.text(title, baseX + 42, y, { width: 380 });

      const lineStart = baseX + 42 + Math.min(380, doc.widthOfString(title) + 6);
      const pageX = 510;
      if (lineStart < pageX - 20) {
        doc.moveTo(lineStart, y + 8).lineTo(pageX - 10, y + 8).dash(1.4, { space: 2 }).strokeColor("#999").lineWidth(0.6).stroke().undash();
      }
      doc.text(String(e.page || ""), pageX, y, { width: 40, align: "right" });

      doc.y = y + 18;
    }
  }
}
function drawNA(doc, text = "N/A") {
  doc.font("Helvetica-Oblique").fontSize(9).fillColor("#666");
  doc.text(text, 58, doc.y, { width: 497 });
  doc.fillColor("#000");
  doc.font("Helvetica");
  doc.moveDown(0.6);
}
function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null || v === "") return [];
  return [v];
}
function asStringList(v) {
  if (Array.isArray(v)) return v.map((x) => clean(x)).filter(Boolean);
  if (typeof v === "string") return v.split(/\r?\n|,/).map((x) => clean(x)).filter(Boolean);
  return [];
}
function normalizeListItems(list) {
  return asArray(list)
    .map((it) => {
      if (!it) return null;
      if (typeof it === "string") return { name: it };
      if (typeof it === "object") return it;
      return null;
    })
    .filter(Boolean);
}
function drawSimpleTable(doc, { cols, rows }) {
  const left = 58;
  const maxW = 555 - left;
  const headerH = 20;
  const rowH = 18;
  const totalW = cols.reduce((a, c) => a + c.w, 0);
  const xs = [left];
  for (let i = 0; i < cols.length; i++) xs.push(xs[i] + cols[i].w);

  ensureSpace(doc, headerH + Math.max(1, rows.length) * rowH + 8, 70);
  const y0 = doc.y;

  rectFillStroke(doc, left, y0, totalW, headerH, V0006.lightBlue, V0006.lineBlue, 1);
  doc.save();
  doc.rect(left, y0, totalW, headerH + rows.length * rowH).lineWidth(1).strokeColor(V0006.lineBlue).stroke();
  for (let i = 1; i < xs.length - 1; i++) doc.moveTo(xs[i], y0).lineTo(xs[i], y0 + headerH + rows.length * rowH).strokeColor(V0006.lineBlue).stroke();
  for (let i = 1; i <= rows.length; i++) {
    const yy = y0 + headerH + i * rowH;
    doc.moveTo(left, yy).lineTo(left + totalW, yy).strokeColor(V0006.lineBlue).stroke();
  }
  doc.restore();

  doc.fillColor(V0006.blue).font("Helvetica-Bold").fontSize(10);
  for (let i = 0; i < cols.length; i++) {
    doc.text(cols[i].title, xs[i] + 4, y0 + 5, { width: cols[i].w - 8, align: cols[i].align || "left" });
  }

  doc.font("Helvetica").fontSize(9).fillColor("#000");
  for (let r = 0; r < rows.length; r++) {
    const yy = y0 + headerH + r * rowH + 4;
    const row = rows[r];
    for (let c = 0; c < cols.length; c++) {
      const col = cols[c];
      doc.text(showNA(row?.[col.key]), xs[c] + 4, yy, { width: col.w - 8, align: col.align || "left" });
    }
  }
  doc.y = y0 + headerH + rows.length * rowH + 8;
}
function drawV0006ChapterTitle(doc, chapterNo, title, destName) {
  const x = 58;
  const y = Math.max(doc.y, 92);
  doc.y = y;
  addNamedDestinationSafe(doc, destName);
  drawTitleWithUnderline(doc, `${chapterNo}. ${title}`, x, y, V0006.blue);
  doc.y = y + 40;
}
function drawV0006SectionBar(doc, text, destName) {
  const left = 58;
  const right = 555;
  const w = right - left;

  ensureSpace(doc, 26, 70);
  const y = doc.y;
  doc.y = y;
  addNamedDestinationSafe(doc, destName);

  rectFillStroke(doc, left, y, w, 22, V0006.lightBlue, V0006.lineBlue, 1);
  doc.fillColor("#000").font("Helvetica-Bold").fontSize(11);
  doc.text(text, left + 10, y + 5, { width: w - 20 });
  doc.y = y + 28;
}

/* =========================================================
 * Part draft normalize + fallback from DB
 * ======================================================= */
function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function blankDraftPart() {
  return {
    cover: {
      projectName: "",
      reportName: "Part Test Report",
      revision: "0.1",
      releasedDate: todayStr(),
      preparedBy: "",
      approvedBy: "",
    },
    dut: { modelName: "", spec: "", amount: 1 },
    enabled: {},
    sections: [],
  };
}

function normalizePartDraft(raw, product = null, reportMetaRow = null) {
  const base = blankDraftPart();
  const obj = raw && typeof raw === "object" ? JSON.parse(JSON.stringify(raw)) : {};

  const draft = { ...base, ...obj };
  draft.cover = { ...base.cover, ...(obj.cover || {}) };
  draft.dut = { ...base.dut, ...(obj.dut || {}) };
  draft.enabled = obj.enabled && typeof obj.enabled === "object" ? { ...obj.enabled } : {};
  draft.sections = Array.isArray(obj.sections) ? obj.sections : [];

  if (!clean(draft.cover.projectName)) {
    draft.cover.projectName =
      clean(reportMetaRow?.projectName) || clean(product?.model) || clean(product?.name) || clean(draft.dut.modelName);
  }
  if (!clean(draft.cover.reportName)) {
    draft.cover.reportName = clean(reportMetaRow?.reportName) || "Part Test Report";
  }
  if (!clean(draft.cover.revision)) {
    draft.cover.revision = clean(reportMetaRow?.revision) || "0.1";
  }
  if (!clean(draft.cover.releasedDate)) {
    draft.cover.releasedDate = clean(reportMetaRow?.releasedDate) || todayStr();
  }
  if (!clean(draft.cover.preparedBy)) draft.cover.preparedBy = clean(reportMetaRow?.preparedBy);
  if (!clean(draft.cover.approvedBy)) draft.cover.approvedBy = clean(reportMetaRow?.approvedBy);

  for (let i = 0; i < draft.sections.length; i++) {
    const sec = draft.sections[i] && typeof draft.sections[i] === "object" ? draft.sections[i] : {};
    sec.key = clean(sec.key) || `SEC_${String(i + 1).padStart(3, "0")}`;
    sec.no = clean(sec.no) || `${i + 2}.`;
    sec.title = clean(sec.title) || `Section ${i + 2}`;
    sec.intro = String(sec.intro || "");
    sec.testCases = Array.isArray(sec.testCases) ? sec.testCases : [];

    for (let j = 0; j < sec.testCases.length; j++) {
      const tc = sec.testCases[j] && typeof sec.testCases[j] === "object" ? sec.testCases[j] : {};
      tc.code = clean(tc.code) || `${sec.key}_${String(j + 1).padStart(3, "0")}`;
      tc.title = clean(tc.title) || clean(tc.testCase) || `Test Case ${j + 1}`;
      tc.procedure = String(tc.procedure ?? tc.testProcedure ?? "");
      tc.criteria = String(tc.criteria ?? tc.testCriteria ?? "");
      tc.estHrs = toNum(tc.estHrs ?? tc.workHrs ?? tc.hours, 0);
      tc.records = Array.isArray(tc.records) ? tc.records : [];
      sec.testCases[j] = tc;
    }

    if (draft.enabled[sec.key] === undefined) draft.enabled[sec.key] = true;
    draft.sections[i] = sec;
  }

  return draft;
}

async function buildDraftFromDb(productId, product = null, reportMetaRow = null) {
  const where = { productId };
  if (hasAttr(TestCase, "isDeleted")) where.isDeleted = false;

  const rows = await TestCase.findAll({
    where,
    raw: true,
    order: [
      hasAttr(TestCase, "category") ? ["category", "ASC"] : ["id", "ASC"],
      hasAttr(TestCase, "code") ? ["code", "ASC"] : ["id", "ASC"],
      ["id", "ASC"],
    ],
  }).catch(() => []);

  const sectionsMap = new Map();
  for (const row of rows || []) {
    const rawCat = clean(row.category) || "General";
    const key = rawCat.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "General";
    if (!sectionsMap.has(key)) {
      sectionsMap.set(key, {
        key,
        no: "",
        title: rawCat,
        intro: "",
        testCases: [],
      });
    }

    const result = String(row.result || "").toLowerCase();
    let recordResult = "UNTESTED";
    if (result === "pass") recordResult = "PASS";
    else if (result === "fail") recordResult = "FAIL";

    sectionsMap.get(key).testCases.push({
      code: clean(row.code) || `TC_${row.id}`,
      title: clean(row.testCase || row.title || row.name),
      procedure: String(row.testProcedure || ""),
      criteria: String(row.testCriteria || ""),
      estHrs: toNum(row.workHrs, 0),
      records: [{ remark: String(row.remark || ""), result: recordResult, hours: toNum(row.workHrs, 0) }],
      extra: parseJsonMaybe(row.extra) || row.extra || null,
    });
  }

  const draft = blankDraftPart();
  draft.cover.projectName = clean(reportMetaRow?.projectName) || clean(product?.model) || clean(product?.name);
  draft.cover.reportName = clean(reportMetaRow?.reportName) || "Part Test Report";
  draft.cover.revision = clean(reportMetaRow?.revision) || "0.1";
  draft.cover.releasedDate = clean(reportMetaRow?.releasedDate) || todayStr();
  draft.cover.preparedBy = clean(reportMetaRow?.preparedBy);
  draft.cover.approvedBy = clean(reportMetaRow?.approvedBy);
  draft.dut.modelName = clean(product?.model) || clean(product?.name);
  draft.dut.spec = clean(product?.description);
  draft.dut.amount = 1;

  draft.sections = Array.from(sectionsMap.values()).map((sec, idx) => ({ ...sec, no: `${idx + 2}.` }));
  for (const sec of draft.sections) draft.enabled[sec.key] = true;
  return normalizePartDraft(draft, product, reportMetaRow);
}

/* =========================================================
 * Part records / summary / env
 * ======================================================= */
function normalizePartResult(v) {
  const s = clean(v).toUpperCase();
  if (s === "PASS") return "pass";
  if (s === "FAIL") return "fail";
  if (s === "NA" || s === "N/A") return "na";
  return "pending";
}
function partResultLabel(result) {
  if (result === "pass") return "PASS";
  if (result === "fail") return "FAIL";
  if (result === "na") return "N/A";
  return "Untested";
}
function summarizePartRecords(records = []) {
  const arr = Array.isArray(records) ? records : [];
  let workHours = 0;
  let hasPass = false;
  let hasFail = false;
  let hasNA = false;
  let tested = false;

  for (const r of arr) {
    workHours += toNum(r?.hours ?? r?.workHrs ?? r?.workHours, 0);
    const rr = normalizePartResult(r?.result);
    if (rr === "pass") {
      tested = true;
      hasPass = true;
    } else if (rr === "fail") {
      tested = true;
      hasFail = true;
    } else if (rr === "na") {
      tested = true;
      hasNA = true;
    }
  }

  let result = "pending";
  if (hasFail) result = "fail";
  else if (hasPass) result = "pass";
  else if (hasNA) result = "na";

  return {
    result,
    resultLabel: partResultLabel(result),
    workHours,
    tested,
    pass: result === "pass",
    fail: result === "fail",
    na: result === "na",
    pending: result === "pending",
  };
}
function parseRemarkImages(remark) {
  const s = String(remark || "");
  const out = [];
  const md = /!\[[^\]]*]\(([^)]+)\)/g;
  let m;
  while ((m = md.exec(s))) {
    const url = clean(m[1]);
    if (url) out.push(url);
  }
  return out;
}
function stripImagesFromRemark(remark) {
  return String(remark || "").replace(/!\[[^\]]*]\(([^)]+)\)/g, "").trim();
}
function gatherEnvFromAny(...sources) {
  const keys = [
    "showInputVoltage", "inputVoltage",
    "showTemperature", "temperature",
    "showHumidity", "humidity",
    "showCpuConfig", "cpuConfig", "cpuTemp",
    "showMemoryConfig", "memoryConfig", "memoryTemp",
    "showDiskConfig", "diskConfig", "diskTemp",
  ];
  const out = {};
  for (const s of sources) {
    const src = parseJsonMaybe(s) || s;
    if (!src || typeof src !== "object") continue;
    for (const k of keys) {
      if (src[k] !== undefined && src[k] !== null && src[k] !== "") out[k] = src[k];
    }
  }
  return out;
}
function shouldShowOptionalEnv(env, showKey, valueKey) {
  const s = triBool(env?.[showKey]);
  if (s !== null) return s;
  return clean(env?.[valueKey]) !== "" || Number.isFinite(Number(env?.[valueKey]));
}
function hasAnyEnvData(env) {
  if (!env || typeof env !== "object") return false;
  return [
    "inputVoltage",
    "temperature",
    "humidity",
    "cpuConfig",
    "memoryConfig",
    "diskConfig",
    "cpuTemp",
    "memoryTemp",
    "diskTemp",
  ].some((k) => clean(env?.[k]) !== "" || Number.isFinite(Number(env?.[k])));
}
function buildPartRowFromTc(tc) {
  const records = Array.isArray(tc?.records) ? tc.records : [];
  const stat = summarizePartRecords(records);

  const recordLines = [];
  const images = [];
  const env = gatherEnvFromAny(tc?.env, tc?.extra, tc?.meta, tc?.testCondition);

  for (let i = 0; i < records.length; i++) {
    const r = records[i] && typeof records[i] === "object" ? records[i] : {};
    const remarkRaw = String(r.remark || r.note || r.comment || "");
    const remarkText = stripImagesFromRemark(remarkRaw);
    const rr = normalizePartResult(r.result);
    const label = partResultLabel(rr);
    const hrs = toNum(r.hours ?? r.workHrs ?? r.workHours, 0);

    if (remarkText || rr !== "pending" || hrs > 0) {
      const bits = [];
      if (remarkText) bits.push(remarkText);
      bits.push(`[${label}]`);
      if (hrs > 0) bits.push(`(${hrs.toFixed(2)} hrs)`);
      recordLines.push(`${i + 1}. ${bits.join(" ")}`.trim());
    }

    images.push(...parseRemarkImages(remarkRaw));
    Object.assign(env, gatherEnvFromAny(r?.env, r?.extra, r?.meta, r?.testCondition));
  }

  const tcRemark = String(tc?.remark || tc?.comments || tc?.note || "");
  const tcRemarkText = stripImagesFromRemark(tcRemark);
  if (tcRemarkText) recordLines.push(tcRemarkText);
  images.push(...parseRemarkImages(tcRemark));
  images.push(...asArray(tc?.images));
  images.push(...asArray(tc?.photos));

  const remarkText = recordLines.join("\n");
  return {
    tcCode: clean(tc?.code),
    testCase: clean(tc?.title || tc?.testCase),
    result: stat.result,
    resultLabel: stat.resultLabel,
    workHours: stat.workHours,
    tested: stat.tested,
    na: stat.na,
    procedureText: stripHtmlSimple(tc?.procedure || tc?.testProcedure || ""),
    criteriaText: stripHtmlSimple(tc?.criteria || tc?.testCriteria || ""),
    env,
    remarkText,
    images: Array.from(new Set(images.filter(Boolean))),
  };
}
function computeSectionStats(sec) {
  const rows = (sec?.testCases || []).map(buildPartRowFromTc);
  let total = 0;
  let pass = 0;
  let fail = 0;
  let untested = 0;
  let tested = 0;
  let na = 0;
  let workHours = 0;

  for (const r of rows) {
    total += 1;
    workHours += toNum(r.workHours, 0);
    if (r.tested) tested += 1;
    if (r.result === "pass") pass += 1;
    else if (r.result === "fail") fail += 1;
    else if (r.result === "na") na += 1;
    else untested += 1;
  }

  return { total, pass, fail, untested, tested, na, workHours, rows };
}
function buildPartReportData(draft, product = null) {
  const sectionsAll = Array.isArray(draft?.sections) ? draft.sections : [];
  const enabled = draft?.enabled && typeof draft.enabled === "object" ? draft.enabled : {};
  const sections = sectionsAll.filter((sec) => enabled[clean(sec?.key)] !== false);

  const summary = sections.map((sec, idx) => {
    const st = computeSectionStats(sec);
    return {
      key: clean(sec?.key) || `SEC_${idx + 1}`,
      no: clean(sec?.no) || `${idx + 2}.`,
      title: clean(sec?.title) || `Section ${idx + 2}`,
      category: `${clean(sec?.no) || `${idx + 2}.`} ${clean(sec?.title) || `Section ${idx + 2}`}`.trim(),
      total: st.total,
      pass: st.pass,
      fail: st.fail,
      pending: st.untested,
      untested: st.untested,
      tested: st.tested,
      na: st.na,
      workHours: st.workHours,
      rows: st.rows,
      intro: String(sec?.intro || ""),
    };
  });

  const overall = summary.reduce(
    (acc, s) => {
      acc.total += s.total || 0;
      acc.pass += s.pass || 0;
      acc.fail += s.fail || 0;
      acc.pending += s.pending || 0;
      acc.untested += s.untested || 0;
      acc.tested += s.tested || 0;
      acc.na += s.na || 0;
      acc.workHours += toNum(s.workHours, 0);
      return acc;
    },
    { total: 0, pass: 0, fail: 0, pending: 0, untested: 0, tested: 0, na: 0, workHours: 0 }
  );

  return { product: product || null, summary, overall, sections };
}

/* =========================================================
 * Cover / Summary
 * ======================================================= */
function pickCoverSignRef(v) {
  if (!v) return "";
  if (typeof v === "string" || typeof v === "number") return clean(v);
  if (typeof v === "object") {
    return clean(
      v.url ||
      v.previewUrl ||
      v.downloadUrl ||
      v.path ||
      v.src ||
      v.id ||
      ""
    );
  }
  return "";
}
function getPartCoverMeta(draft, product, reportMetaRow, req) {
  const q = req?.query || {};
  const cover = draft?.cover && typeof draft.cover === "object" ? draft.cover : {};

  const meta = {
    projectName:
      clean(q.projectName) ||
      clean(cover.projectName) ||
      clean(reportMetaRow?.projectName) ||
      clean(draft?.dut?.modelName) ||
      clean(product?.model) ||
      clean(product?.name),

    reportName:
      clean(q.reportName) ||
      clean(cover.reportName) ||
      clean(reportMetaRow?.reportName) ||
      "Test Report",

    revision:
      clean(q.revision) ||
      clean(cover.revision) ||
      clean(reportMetaRow?.revision) ||
      "0.1",

    releasedDate:
      clean(q.releasedDate || q.releaseDate || q.reportDate) ||
      clean(cover.releasedDate) ||
      clean(reportMetaRow?.releasedDate),

    preparedBy:
      clean(q.preparedBy) ||
      clean(cover.preparedBy) ||
      clean(reportMetaRow?.preparedBy),

    approvedBy:
      clean(q.approvedBy) ||
      clean(cover.approvedBy) ||
      clean(reportMetaRow?.approvedBy),

    preparedSig:
      clean(q.preparedSig) ||
      pickCoverSignRef(cover.preparedBySign) ||
      pickCoverSignRef(cover.preparedSignature) ||
      pickCoverSignRef(cover.preparedSig) ||
      clean(cover.preparedSignatureFileId || cover.preparedSigFileId),

    approvedSig:
      clean(q.approvedSig) ||
      pickCoverSignRef(cover.approvedBySign) ||
      pickCoverSignRef(cover.approvedSignature) ||
      pickCoverSignRef(cover.approvedSig) ||
      clean(cover.approvedSignatureFileId || cover.approvedSigFileId),

    dbVersion:
      clean(q.dbVersion || q.databaseVersion) ||
      clean(cover.databaseVer || cover.dbVersion) ||
      clean(reportMetaRow?.tplVersion) ||
      clean(reportMetaRow?.dbVersion) ||
      "0006",

    summaryRemark:
      clean(draft?.summaryRemark || draft?.remarks || draft?.remark) ||
      clean(reportMetaRow?.summaryRemark) ||
      "",
  };

  if (!meta.preparedSig && clean(reportMetaRow?.preparedSignatureFileId)) {
    meta.preparedSig = clean(reportMetaRow?.preparedSignatureFileId);
  }
  if (!meta.approvedSig && clean(reportMetaRow?.approvedSignatureFileId)) {
    meta.approvedSig = clean(reportMetaRow?.approvedSignatureFileId);
  }

  return meta;
}
async function drawCoverV0006Part(doc, { coverMeta, fileCache }) {
  const W = doc.page.width;
  const H = doc.page.height;

  const sysName = clean(coverMeta?.projectName) || "[System Model Name]";
  const reportName = clean(coverMeta?.reportName) || "Test Report";
  const rev = clean(coverMeta?.revision) || "0.1";
  const releasedDate = parseDateLike(coverMeta?.releasedDate) || new Date();
  const dbVerRaw = clean(coverMeta?.dbVersion) || "0006";
  const dbVer = /^v/i.test(dbVerRaw) ? dbVerRaw : `v${dbVerRaw}`;

  const preparedBy = clean(coverMeta?.preparedBy);
  const approvedBy = clean(coverMeta?.approvedBy);

  const preparedSig = await loadImageBufferFromAny(coverMeta?.preparedSig, fileCache);
  const approvedSig = await loadImageBufferFromAny(coverMeta?.approvedSig, fileCache);

  doc.save();
  doc.rect(0, 0, W, H).fill("#ffffff");
  doc.restore();

  doc.fillColor("#000");
  doc.font("Helvetica").fontSize(34);
  doc.text(sysName, 0, 185, { width: W, align: "center", lineBreak: false });

  doc.font("Helvetica").fontSize(22);
  doc.text(reportName, 0, 245, { width: W, align: "center", lineBreak: false });

  doc.font("Helvetica-Bold").fontSize(12);
  doc.text(`Revision: R${rev}`, 0, 332, { width: W, align: "center", lineBreak: false });
  doc.text(`Released Date: ${formatDateEn(releasedDate)}`, 0, 356, { width: W, align: "center", lineBreak: false });

  const boxW = 338;
  const boxH = 92;
  const boxX = (W - boxW) / 2;
  const boxY = 404;
  const midX = boxX + boxW / 2;
  const headerH = 24;

  doc.save();
  doc.lineWidth(1).strokeColor("#000");
  doc.rect(boxX, boxY, boxW, boxH).stroke();
  doc.moveTo(midX, boxY).lineTo(midX, boxY + boxH).stroke();
  doc.moveTo(boxX, boxY + headerH).lineTo(boxX + boxW, boxY + headerH).stroke();
  doc.restore();

  doc.font("Helvetica").fontSize(10).fillColor("#000");
  doc.text("Prepared & Tested By", boxX, boxY + 7, {
    width: boxW / 2,
    align: "center",
    lineBreak: false,
  });
  doc.text("Reviewed & Approved By", midX, boxY + 7, {
    width: boxW / 2,
    align: "center",
    lineBreak: false,
  });

  if (preparedSig) {
    try {
      doc.image(preparedSig, boxX + 22, boxY + 34, {
        fit: [boxW / 2 - 44, 24],
        align: "center",
        valign: "center",
      });
    } catch {}
  }
  doc.font("Helvetica").fontSize(10).fillColor("#000");
  doc.text(preparedBy || "", boxX + 10, boxY + 64, {
    width: boxW / 2 - 20,
    align: "center",
    lineBreak: false,
  });

  if (approvedSig) {
    try {
      doc.image(approvedSig, midX + 22, boxY + 34, {
        fit: [boxW / 2 - 44, 24],
        align: "center",
        valign: "center",
      });
    } catch {}
  }
  doc.font("Helvetica").fontSize(10).fillColor("#000");
  doc.text(approvedBy || "", midX + 10, boxY + 64, {
    width: boxW / 2 - 20,
    align: "center",
    lineBreak: false,
  });

  doc.font("Helvetica").fontSize(11).fillColor("#000");
  doc.text("Smart Industry Enabler", 0, H - 118, {
    width: W,
    align: "center",
    lineBreak: false,
  });

  doc.font("Helvetica").fontSize(11);
  doc.text("www.aplex.com", 0, H - 98, {
    width: W,
    align: "center",
    lineBreak: false,
  });

  doc.font("Helvetica").fontSize(11);
  doc.text(`Database ver. ${dbVer}`, 0, H - 78, {
    width: W,
    align: "center",
    lineBreak: false,
  });

  doc.font("Helvetica-Bold").fontSize(20).fillColor("#000");
  doc.text("APLEX", W - 120, H - 92, {
    width: 95,
    align: "left",
    lineBreak: false,
  });

  doc.font("Helvetica").fontSize(11).fillColor("#000");
  doc.text("Technology", W - 118, H - 70, {
    width: 95,
    align: "left",
    lineBreak: false,
  });
}
function drawSummaryV0006Part(doc, { summary = [], overall = {}, coverMeta = {} }) {
  drawTitleWithUnderline(doc, "Summary of Test", 58, 108, V0006.blue);

  const rows = (summary || []).map((s) => ({
    name: s.category || `${s.no || ""} ${s.title || ""}`.trim(),
    total: Number(s.total || 0),
    pass: Number(s.pass || 0),
    fail: Number(s.fail || 0),
    untested: Number(s.untested ?? s.pending ?? 0),
  }));

  const total = Number(overall?.total || 0);
  const pass = Number(overall?.pass || 0);
  const fail = Number(overall?.fail || 0);
  const tested = pass + fail;

  const x1 = 36;
  const x2 = 299;
  const x3 = 362;
  const x4 = 426;
  const x5 = 490;
  const x6 = 555;

  const yTop = 155;
  const headerH = 20;
  const rowH = 18;
  const tableW = x6 - x1;
  const tableH = headerH + rows.length * rowH;

  rectFillStroke(doc, x1, yTop, tableW, headerH, V0006.lightBlue, V0006.lineBlue, 1);

  doc.save();
  doc.rect(x1, yTop, tableW, tableH).lineWidth(1).strokeColor(V0006.lineBlue).stroke();
  for (const xx of [x2, x3, x4, x5]) {
    doc.moveTo(xx, yTop).lineTo(xx, yTop + tableH).strokeColor(V0006.lineBlue).stroke();
  }
  for (let i = 0; i <= rows.length; i++) {
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
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const yy = yTop + headerH + i * rowH + 4;

    doc.fillColor("#000");
    doc.text(r.name, x1 + 6, yy, { width: x2 - x1 - 12 });

    doc.text(String(r.total), x2, yy, { width: x3 - x2, align: "center" });

    doc.fillColor("#18a23b");
    doc.text(String(r.pass), x3, yy, { width: x4 - x3, align: "center" });

    doc.fillColor("#d9363e");
    doc.text(String(r.fail), x4, yy, { width: x5 - x4, align: "center" });

    doc.fillColor("#000");
    doc.text(String(r.untested), x5, yy, { width: x6 - x5, align: "center" });
  }

  const rateY0 = yTop + tableH + 16;
  const rateRowH = 23;

  const rateLine = (label, value, y) => {
    doc.save();
    doc.rect(x1, y, tableW, rateRowH).lineWidth(1).strokeColor(V0006.lineBlue).stroke();
    doc.restore();

    doc.font("Helvetica-Bold").fontSize(10).fillColor("#000");
    doc.text(label, x1 + 8, y + 6, { width: 180 });

    doc.text(value, x1, y + 6, {
      width: tableW - 10,
      align: "right",
    });
  };

  rateLine("Completed Rate", pctVal(tested, total), rateY0);
  rateLine("PASS Rate", pctVal(pass, total), rateY0 + rateRowH);
  rateLine("FAIL Rate", pctVal(fail, total), rateY0 + rateRowH * 2);

  const remarksTitleY = rateY0 + rateRowH * 3 + 12;
  const remarksBoxY = remarksTitleY + 22;
  const remarksBoxH = 255;

  rectFillStroke(doc, x1, remarksTitleY, tableW, 22, V0006.lightBlue, V0006.lineBlue, 1);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000");
  doc.text("Remarks :", x1 + 8, remarksTitleY + 6);

  doc.save();
  doc.rect(x1, remarksBoxY, tableW, remarksBoxH).lineWidth(1).strokeColor(V0006.lineBlue).stroke();
  doc.restore();

  const remarksText = clean(coverMeta?.summaryRemark || overall?.summaryRemark || "");
  if (remarksText) {
    doc.font("Helvetica").fontSize(10).fillColor("#000");
    doc.text(stripHtmlSimple(remarksText), x1 + 10, remarksBoxY + 10, {
      width: tableW - 20,
      height: remarksBoxH - 20,
    });
  }
}

/* =========================================================
 * Config chapter（固定 v0006 第 1 章，但資料吃 Part draft）
 * ======================================================= */
function buildPartConfigPayload(draft, product) {
  const cfg =
    parseJsonMaybe(draft?.configJson) ||
    draft?.config ||
    draft?.configSheet ||
    {};

  const dutList = normalizeListItems(
    cfg?.dutList ||
      cfg?.dut_list ||
      cfg?.duts ||
      cfg?.systems ||
      (draft?.dut?.modelName || draft?.dut?.spec
        ? [{
            model: draft?.dut?.modelName || product?.model || product?.name,
            qty: draft?.dut?.amount || 1,
            spec: draft?.dut?.spec || product?.description || "",
            note: clean(product?.name),
          }]
        : [])
  );

  const utilitiesList = normalizeListItems(
    cfg?.utilitiesList ||
      cfg?.utilities ||
      cfg?.utilList ||
      draft?.utilitiesList ||
      draft?.utilities
  );

  const accessoriesList = normalizeListItems(
    cfg?.accessories ||
      cfg?.accessoriesList ||
      cfg?.supportedDevices ||
      draft?.accessories ||
      draft?.supportedDevices
  );

  const appearanceImages = [
    ...asArray(cfg?.appearance?.topPhotos),
    ...asArray(cfg?.appearance?.bottomPhotos),
    ...asArray(
      cfg?.appearanceImages ||
      cfg?.appearancePhotos ||
      draft?.appearanceImages ||
      draft?.photos ||
      draft?.images
    ),
  ].filter(Boolean);

  return { dutList, utilitiesList, accessoriesList, appearanceImages };
}
async function renderConfigChapterV0006Part(doc, { tocEntries, getPageNo, draft, product, fileCache }) {
  const cfg = buildPartConfigPayload(draft, product);

  const chDest = makeDestName("ch", "1");
  drawV0006ChapterTitle(doc, 1, "Configuration & Utilities", chDest);
  tocEntries.push({ level: 0, no: "1.", title: "Configuration & Utilities", page: getPageNo(), dest: chDest });

  {
    const b = { no: "1.1", title: "DUT List" };
    const dest = makeDestName("sec", b.no);
    drawV0006SectionBar(doc, `${b.no} ${b.title}`, dest);
    tocEntries.push({ level: 1, no: b.no, title: b.title, page: getPageNo(), dest });

    if (!cfg.dutList.length) {
      drawNA(doc);
    } else {
      const rows = cfg.dutList.map((it, idx) => ({
        no: String(it.no ?? it.index ?? idx + 1),
        model: clean(it.model ?? it.modelName ?? it.systemModel ?? it.name ?? it.dut ?? it.title),
        qty: clean(it.qty ?? it.amount ?? it.count ?? "1"),
        spec: clean(it.spec ?? it.desc ?? it.description),
        note: clean(it.note ?? it.remark ?? it.remarks ?? it.sn ?? it.serial),
      }));
      drawSimpleTable(doc, {
        cols: [
          { key: "no", title: "No.", w: 34 },
          { key: "model", title: "Model / DUT", w: 150 },
          { key: "qty", title: "Qty", w: 45 },
          { key: "spec", title: "Spec.", w: 160 },
          { key: "note", title: "Note", w: (555 - 58) - (34 + 150 + 45 + 160) },
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

    if (!cfg.utilitiesList.length) {
      drawNA(doc);
    } else {
      const rows = cfg.utilitiesList.map((it, idx) => ({
        no: String(it.no ?? it.index ?? idx + 1),
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
          { key: "note", title: "Note", w: (555 - 58) - (34 + 160 + 70 + 140) },
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

    if (!cfg.accessoriesList.length) {
      drawNA(doc);
    } else {
      const rows = cfg.accessoriesList.map((it, idx) => ({
        no: String(it.no ?? it.index ?? idx + 1),
        item: clean(it.item ?? it.name ?? it.device ?? it.title),
        spec: clean(it.spec ?? it.model ?? it.partNo ?? it.pn ?? it.partNumber),
        note: clean(it.note ?? it.remark ?? it.remarks ?? it.desc ?? it.description),
      }));
      drawSimpleTable(doc, {
        cols: [
          { key: "no", title: "No.", w: 34 },
          { key: "item", title: "Item", w: 210 },
          { key: "spec", title: "Model / P/N", w: 140 },
          { key: "note", title: "Note", w: (555 - 58) - (34 + 210 + 140) },
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
    await drawAppearanceImages(doc, cfg.appearanceImages, fileCache);
  }
}
async function drawAppearanceImages(doc, images, fileCache) {
  const left = 58;
  const maxW = 555 - left;
  const arr = asArray(images).filter(Boolean);
  if (!arr.length) {
    drawNA(doc, "N/A (You can place assembled system photos here.)");
    return;
  }

  for (let i = 0; i < arr.length; i++) {
    const src = arr[i];
    const buf = await loadImageBufferFromAny(src, fileCache);

    ensureSpace(doc, 18, 70);
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

    const marginBottom = 70;
    const bottom = doc.page.height - marginBottom;
    let remainH = bottom - doc.y;
    if (remainH < 120) {
      doc._v0006AddPage?.();
      remainH = (doc.page.height - marginBottom) - doc.y;
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

/* =========================================================
 * Body render
 * ======================================================= */
function v0006TcCols() {
  const x1 = 58;
  const xR = 555;
  const w = xR - x1;
  const cCode = 92;
  const cRes = 84;
  const cHrs = 70;
  const cName = w - cCode - cRes - cHrs;
  return { x1, x2: x1 + cCode, x3: x1 + cCode + cName, x4: x1 + cCode + cName + cRes, xR, cCode, cName, cRes, cHrs };
}
function fmtEnv(v) {
  if (v === 0 || v === "0") return "0";
  const s = clean(v);
  if (s) return s;
  const n = Number(v);
  if (Number.isFinite(n)) return String(n);
  return "N/A";
}
function shouldShowEnvBlockPart(row) {
  const env = row?.env || {};
  return hasAnyEnvData(env);
}
function drawV0006TcTableHeader(doc) {
  const C = v0006TcCols();
  ensureSpace(doc, 22, 70);
  const y = doc.y;
  rectFillStroke(doc, C.x1, y, C.xR - C.x1, 20, V0006.lightBlue, V0006.lineBlue, 1);
  doc.fillColor(V0006.blue).font("Helvetica-Bold").fontSize(10);
  doc.text("TC Code", C.x1 + 6, y + 5, { width: C.cCode - 12 });
  doc.text("Test Case", C.x2 + 6, y + 5, { width: C.cName - 12 });
  doc.text("Result", C.x3, y + 5, { width: C.cRes, align: "center" });
  doc.text("Work hrs", C.x4, y + 5, { width: C.cHrs, align: "center" });
  doc.y = y + 22;
}
function drawV0006TcRow(doc, r) {
  const C = v0006TcCols();
  const lineGap = 2;
  const name = String(r?.testCase || "");
  doc.font("Helvetica").fontSize(10);
  const nameH = name ? doc.heightOfString(name, { width: C.cName - 12, align: "left", lineGap }) : 0;
  const rowH = Math.max(24, nameH + 10);
  ensureSpace(doc, rowH + 6, 70);
  const y = doc.y;

  doc.save();
  doc.lineWidth(1.0).strokeColor(V0006.lineBlue);
  doc.rect(C.x1, y, C.xR - C.x1, rowH).stroke();
  doc.moveTo(C.x2, y).lineTo(C.x2, y + rowH).stroke();
  doc.moveTo(C.x3, y).lineTo(C.x3, y + rowH).stroke();
  doc.moveTo(C.x4, y).lineTo(C.x4, y + rowH).stroke();
  doc.restore();

  const padY = 6;
  doc.fillColor("#000").font("Helvetica").fontSize(10);
  doc.text(String(r.tcCode || ""), C.x1 + 6, y + padY, { width: C.cCode - 12 });
  doc.text(name, C.x2 + 6, y + padY, { width: C.cName - 12, lineGap });

  const rc = r.result === "pass" ? V0006.pass : r.result === "fail" ? V0006.fail : r.result === "na" ? V0006.blue : V0006.pending;
  doc.fillColor(rc).font("Helvetica-Bold").fontSize(10);
  doc.text(String(r.resultLabel || "Untested"), C.x3, y + padY, { width: C.cRes, align: "center" });

  doc.fillColor("#000").font("Helvetica").fontSize(10);
  doc.text(toNum(r.workHours, 0).toFixed(1), C.x4, y + padY, { width: C.cHrs, align: "center" });
  doc.y = y + rowH + 6;
}
function drawEnvBlockV0006Part(doc, row) {
  const left = 58;
  const maxW = 555 - left;
  const lineGap = 2;
  if (!shouldShowEnvBlockPart(row)) return;
  const env = row?.env || {};

  const colW = Math.floor(maxW / 3);
  const x1 = left;
  const x2 = left + colW;
  const x3 = left + colW * 2;

  const showV = shouldShowOptionalEnv(env, "showInputVoltage", "inputVoltage");
  const showT = shouldShowOptionalEnv(env, "showTemperature", "temperature");
  const showH = shouldShowOptionalEnv(env, "showHumidity", "humidity");
  const showCpu = shouldShowOptionalEnv(env, "showCpuConfig", "cpuConfig") || clean(env?.cpuTemp) !== "";
  const showMem = shouldShowOptionalEnv(env, "showMemoryConfig", "memoryConfig") || clean(env?.memoryTemp) !== "";
  const showDisk = shouldShowOptionalEnv(env, "showDiskConfig", "diskConfig") || clean(env?.diskTemp) !== "";

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000");
  doc.text("Test Condition / Measurements:", left, doc.y, { width: maxW, lineGap });
  doc.font("Helvetica").fontSize(10).fillColor("#000");

  const row1Y = doc.y;
  const t1 = showV ? `Input Voltage (V): ${fmtEnv(env.inputVoltage)}` : "";
  const t2 = showT ? `Temperature (°C): ${fmtEnv(env.temperature)}` : "";
  const t3 = showH ? `Humidity (%RH): ${fmtEnv(env.humidity)}` : "";

  if (showV) doc.text(t1, x1, row1Y, { width: colW, lineGap, lineBreak: false });
  if (showT) doc.text(t2, x2, row1Y, { width: colW, lineGap, lineBreak: false });
  if (showH) doc.text(t3, x3, row1Y, { width: colW, lineGap, lineBreak: false });

  const row1H = Math.max(
    0,
    showV ? doc.heightOfString(t1, { width: colW, lineGap }) : 0,
    showT ? doc.heightOfString(t2, { width: colW, lineGap }) : 0,
    showH ? doc.heightOfString(t3, { width: colW, lineGap }) : 0
  );
  doc.y = row1Y + row1H;

  const writeOpt = (leftText, rightText) => {
    const y0 = doc.y;
    doc.text(leftText, x1, y0, { width: colW, lineGap, lineBreak: false });
    doc.text(rightText, x3, y0, { width: colW, lineGap, lineBreak: false });
    const h = Math.max(
      doc.heightOfString(leftText, { width: colW, lineGap }),
      doc.heightOfString(rightText, { width: colW, lineGap })
    );
    doc.y = y0 + h;
  };

  if (showCpu) writeOpt(`CPU: ${showNA(env?.cpuConfig)}`, `CPU Temp (°C): ${fmtEnv(env?.cpuTemp)}`);
  if (showMem) writeOpt(`Memory: ${showNA(env?.memoryConfig)}`, `Memory Temp (°C): ${fmtEnv(env?.memoryTemp)}`);
  if (showDisk) writeOpt(`Disk: ${showNA(env?.diskConfig)}`, `Disk Temp (°C): ${fmtEnv(env?.diskTemp)}`);
  doc.moveDown(0.2);
}
async function drawProcedureCriteria(doc, row) {
  const left = 58;
  const maxW = 555 - left;
  const lineGap = 2;
  const proc = showNA(row?.procedureText);
  const crit = showNA(row?.criteriaText);

  doc.save();
  doc.font("Helvetica-Bold").fontSize(10);
  const labelH = doc.heightOfString("Procedure:", { width: maxW, lineGap });
  doc.font("Helvetica").fontSize(10);
  const procH = doc.heightOfString(proc, { width: maxW, lineGap });
  const critH = doc.heightOfString(crit, { width: maxW, lineGap });
  doc.restore();

  ensureSpace(doc, labelH + procH + 6 + (labelH + critH + 6), 70);

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000");
  doc.text("Procedure:", left, doc.y, { width: maxW, lineGap });
  doc.font("Helvetica").fontSize(10).fillColor(proc === "N/A" ? "#666" : "#000");
  doc.text(proc, left, doc.y, { width: maxW, lineGap });
  doc.fillColor("#000");
  doc.moveDown(0.2);

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000");
  doc.text("Criteria:", left, doc.y, { width: maxW, lineGap });
  doc.font("Helvetica").fontSize(10).fillColor(crit === "N/A" ? "#666" : "#000");
  doc.text(crit, left, doc.y, { width: maxW, lineGap });
  doc.fillColor("#000");
  doc.moveDown(0.2);
}
async function drawRemarkAndImages(doc, row, fileCache) {
  const left = 58;
  const maxW = 555 - left;
  const lineGap = 2;
  const remarkTextRaw = clean(row?.remarkText);
  const remarkText = keepLine(remarkTextRaw);

  doc.save();
  doc.font("Helvetica-Bold").fontSize(10);
  const labelH = doc.heightOfString("Remark:", { width: maxW, lineGap });
  doc.font("Helvetica").fontSize(10);
  const bodyH = doc.heightOfString(remarkText, { width: maxW, lineGap });
  doc.restore();

  ensureSpace(doc, labelH + bodyH + 6, 70);

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000");
  doc.text("Remark:", left, doc.y, { width: maxW, lineGap });
  doc.font("Helvetica").fontSize(10).fillColor(remarkTextRaw ? "#000" : "#666");
  doc.text(remarkText, left, doc.y, { width: maxW, lineGap });
  doc.fillColor("#000");
  doc.moveDown(0.3);

  const imgs = Array.isArray(row?.images) ? row.images : [];
  for (const u of imgs) {
    const buf = await loadImageBufferFromAny(u, fileCache);
    if (!buf) {
      ensureSpace(doc, 14, 70);
      doc.font("Helvetica").fontSize(8).fillColor("#666").text(`Image: ${u}`, left, doc.y, { width: maxW });
      doc.fillColor("#000");
      continue;
    }

    const marginBottom = 70;
    const maxHCap = 360;
    let y0 = doc.y;
    let bottom = doc.page.height - marginBottom;
    let remainH = bottom - y0;

    if (remainH < 70) {
      ensureSpace(doc, 88, marginBottom);
      y0 = doc.y;
      bottom = doc.page.height - marginBottom;
      remainH = bottom - y0;
    }

    const availW = maxW;
    const availH = Math.min(maxHCap, Math.max(30, remainH));
    try {
      const img = typeof doc.openImage === "function" ? doc.openImage(buf) : null;
      const iw = Number(img?.width || 0) || 1;
      const ih = Number(img?.height || 0) || 1;
      const scale = Math.min(availW / iw, availH / ih, 1);
      const drawW = Math.max(1, iw * scale);
      const drawH = Math.max(1, ih * scale);
      doc.image(buf, left, y0, { width: drawW, height: drawH });
      doc.y = y0 + drawH + 6;
    } catch {
      ensureSpace(doc, 14, 70);
      doc.font("Helvetica").fontSize(8).fillColor("#666").text(`(Image embed failed) ${u}`, left, doc.y, { width: maxW });
      doc.fillColor("#000");
    }
  }
}
function measureV0006TestCaseBlockPart(doc, r) {
  const C = v0006TcCols();
  const left = 58;
  const maxW = 555 - left;
  const lineGap = 2;

  const name = String(r?.testCase || "");
  const proc = showNA(r?.procedureText);
  const crit = showNA(r?.criteriaText);
  const remarkText = keepLine(r?.remarkText);
  const imgs = Array.isArray(r?.images) ? r.images : [];
  const env = r?.env && typeof r.env === "object" ? r.env : {};

  let envNeed = 0;
  if (shouldShowEnvBlockPart(r)) {
    const colW = Math.floor(maxW / 3);
    doc.font("Helvetica-Bold").fontSize(10);
    const hTitle = doc.heightOfString("Test Condition / Measurements:", { width: maxW, lineGap });
    doc.font("Helvetica").fontSize(10);

    const showV = shouldShowOptionalEnv(env, "showInputVoltage", "inputVoltage");
    const showT = shouldShowOptionalEnv(env, "showTemperature", "temperature");
    const showH = shouldShowOptionalEnv(env, "showHumidity", "humidity");
    const t1 = showV ? `Input Voltage (V): ${fmtEnv(env?.inputVoltage)}` : "";
    const t2 = showT ? `Temperature (°C): ${fmtEnv(env?.temperature)}` : "";
    const t3 = showH ? `Humidity (%RH): ${fmtEnv(env?.humidity)}` : "";

    const hRow1 = Math.max(
      0,
      showV ? doc.heightOfString(t1, { width: colW, lineGap }) : 0,
      showT ? doc.heightOfString(t2, { width: colW, lineGap }) : 0,
      showH ? doc.heightOfString(t3, { width: colW, lineGap }) : 0
    );

    const showCpu = shouldShowOptionalEnv(env, "showCpuConfig", "cpuConfig") || clean(env?.cpuTemp) !== "";
    const showMem = shouldShowOptionalEnv(env, "showMemoryConfig", "memoryConfig") || clean(env?.memoryTemp) !== "";
    const showDisk = shouldShowOptionalEnv(env, "showDiskConfig", "diskConfig") || clean(env?.diskTemp) !== "";

    const hCpu = showCpu
      ? Math.max(
          doc.heightOfString(`CPU: ${showNA(env?.cpuConfig)}`, { width: colW, lineGap }),
          doc.heightOfString(`CPU Temp (°C): ${fmtEnv(env?.cpuTemp)}`, { width: colW, lineGap })
        )
      : 0;
    const hMem = showMem
      ? Math.max(
          doc.heightOfString(`Memory: ${showNA(env?.memoryConfig)}`, { width: colW, lineGap }),
          doc.heightOfString(`Memory Temp (°C): ${fmtEnv(env?.memoryTemp)}`, { width: colW, lineGap })
        )
      : 0;
    const hDisk = showDisk
      ? Math.max(
          doc.heightOfString(`Disk: ${showNA(env?.diskConfig)}`, { width: colW, lineGap }),
          doc.heightOfString(`Disk Temp (°C): ${fmtEnv(env?.diskTemp)}`, { width: colW, lineGap })
        )
      : 0;

    envNeed = hTitle + hRow1 + hCpu + hMem + hDisk + 8;
  }

  doc.font("Helvetica").fontSize(10);
  const nameH = name ? doc.heightOfString(name, { width: C.cName - 12, lineGap }) : 0;
  const rowH = Math.max(24, nameH + 10);
  const procH = doc.heightOfString(proc, { width: maxW, lineGap });
  const critH = doc.heightOfString(crit, { width: maxW, lineGap });
  const remarkH = doc.heightOfString(remarkText, { width: maxW, lineGap });

  let imgNeed = 0;
  if (imgs.length) imgNeed = Math.min(220, 90 * imgs.length);

  const tcOnly = rowH + 6;
  const keepMin = tcOnly + envNeed + 30;
  const total = tcOnly + envNeed + 12 + procH + 12 + critH + 12 + remarkH + 12 + imgNeed;
  return { tcOnly, keepMin, total };
}

/* =========================================================
 * Auth helpers
 * ======================================================= */
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

/* =========================================================
 * 取 body/query draft
 * ======================================================= */
function getDraftFromRequest(req) {
  const b = req?.body;
  if (b && typeof b === "object") {
    if (b.draft && typeof b.draft === "object") return b.draft;
    if (b.data && typeof b.data === "object") return b.data;
    if (b.cover || b.sections || b.dut) return b;
  }

  const q = req?.query || {};
  if (q.draft) {
    const p = parseJsonMaybe(q.draft);
    if (p && typeof p === "object") return p;
  }
  if (q.draftB64) {
    try {
      const raw = Buffer.from(String(q.draftB64), "base64").toString("utf8");
      const p = parseJsonMaybe(raw);
      if (p && typeof p === "object") return p;
    } catch {}
  }
  return null;
}

/* =========================================================
 * Route
 * ======================================================= */
const ROUTE_PATHS = [
  "/part-test/:id",
  "/part-test/:id.pdf",
  "/part-test/:id/pdf",
  "/part-test/:id/download",
  "/part-test/:id/download.pdf",

  "/products/:id",
  "/product/:id",
  "/products/:id.pdf",
  "/product/:id.pdf",
  "/products/:id/pdf",
  "/product/:id/pdf",
  "/products/:id/download",
  "/product/:id/download",
  "/products/:id/download.pdf",
  "/product/:id/download.pdf",
];

async function handlePartReport(req, res) {
  let doc = null;
  try {
    const raw = String(req.params.id || "");
    const productId = Number(raw.replace(/\.pdf$/i, ""));
    if (!Number.isFinite(productId) || productId <= 0) {
      return res.status(400).json({ success: false, message: "Bad product id" });
    }

    const product = await Product?.findByPk(productId, { raw: true }).catch(() => null);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const reportMetaRow = await ReportMeta?.findOne({ where: { productId } })
      .then((r) => (r ? r.toJSON() : null))
      .catch(() => null);

    const inputDraft = getDraftFromRequest(req);
    const draft = inputDraft
      ? normalizePartDraft(inputDraft, product, reportMetaRow)
      : await buildDraftFromDb(productId, product, reportMetaRow);

    const reportData = buildPartReportData(draft, product);
    const coverMeta = getPartCoverMeta(draft, product, reportMetaRow, req);

    const sysName = clean(coverMeta.projectName) || clean(product?.model) || clean(product?.name) || `Product_${productId}`;
    const rev = clean(coverMeta.revision) || "0.1";
    const filename = safeFilename(`${sysName} Test Report R${rev}_${yyyymmdd(new Date())}.pdf`);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    doc.on("error", (e) => console.error("[partTestReport] pdfkit error:", e));
    doc.pipe(res);

    let currentPageNo = 1;
    doc.on("pageAdded", () => {
      try { currentPageNo += 1; } catch {}
    });
    const getPageNo = () => currentPageNo;

    const fileCache = new Map();
    const tplCache = new Map();
    const useTemplate = boolish(req.query?.template, false);
    if (useTemplate) await preloadTemplateBuffers(tplCache);

    doc._v0006TplKey = "body";
    doc._v0006AddPage = () => {
      doc.addPage();
      if (useTemplate) applyTemplateSync(doc, doc._v0006TplKey || "body", tplCache);
      doc.y = 90;
    };

    if (useTemplate) applyTemplateSync(doc, "cover", tplCache);
    await drawCoverV0006Part(doc, { coverMeta, fileCache });

    doc.addPage();
    if (useTemplate) applyTemplateSync(doc, "summary", tplCache);
    drawSummaryV0006Part(doc, { summary: reportData.summary, overall: reportData.overall, coverMeta });

    const tocEntriesPlan = [{ level: 0, no: "1.", title: "Configuration & Utilities" }];
    tocEntriesPlan.push(
      { level: 1, no: "1.1", title: "DUT List" },
      { level: 1, no: "1.2", title: "Utilities List" },
      { level: 1, no: "1.3", title: "List of Supported Devices & Accessories" },
      { level: 1, no: "1.4", title: "Appearance of Assembled System" }
    );
    const reportSections = Array.isArray(reportData?.summary) ? reportData.summary : [];
    for (let i = 0; i < reportSections.length; i++) {
      const sec = reportSections[i] || {};
      tocEntriesPlan.push({
        level: 0,
        no: clean(sec.no) || `${i + 2}.`,
        title: clean(sec.title) || `Section ${i + 2}`,
      });
    }

    const tocPageCount = estimateTocPagesFromEntriesCount(tocEntriesPlan.length);
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
    doc.y = 90;
    const tocEntries = [];

    doc._v0006TplKey = useTemplate ? "config" : "body";
    if (useTemplate) applyTemplateSync(doc, doc._v0006TplKey, tplCache);
    await renderConfigChapterV0006Part(doc, { tocEntries, getPageNo, draft, product, fileCache });

    doc._v0006TplKey = "body";
    for (let i = 0; i < reportSections.length; i++) {
      const sec = reportSections[i] || {};
      const secRows = Array.isArray(sec.rows) ? sec.rows : [];

      doc._v0006AddPage();

      const chapterNo = clean(sec.no).replace(/\.$/, "") || String(i + 2);
      const chapterDest = makeDestName("ch", sec.no || chapterNo);
      drawV0006ChapterTitle(doc, chapterNo, sec.title, chapterDest);
      tocEntries.push({
        level: 0,
        no: clean(sec.no) || `${i + 2}.`,
        title: clean(sec.title) || `Section ${i + 2}`,
        page: getPageNo(),
        dest: chapterDest,
      });

      if (clean(sec.intro)) {
        doc.font("Helvetica").fontSize(10).fillColor("#444");
        doc.text(stripHtmlSimple(sec.intro), 58, doc.y, { width: 555 - 58, lineGap: 2 });
        doc.fillColor("#000");
        doc.moveDown(0.4);
      }

      doc.fillColor("#333").font("Helvetica").fontSize(10);
      doc.text(
        `Total ${toNum(sec.total, 0)} / PASS ${toNum(sec.pass, 0)} / FAIL ${toNum(sec.fail, 0)} / Untested ${toNum(sec.untested, 0)} / Work hrs ${toNum(sec.workHours, 0).toFixed(1)}`,
        58,
        doc.y,
        { width: 555 - 58 }
      );
      doc.fillColor("#000");
      doc.moveDown(0.4);

      if (!secRows.length) {
        doc.font("Helvetica").fontSize(10).fillColor("#666");
        doc.text("N/A", 58, doc.y, { width: 555 - 58 });
        doc.fillColor("#000");
        doc.moveDown(0.6);
        continue;
      }

      let headerPageNo = null;
      for (let idx = 0; idx < secRows.length; idx++) {
        const row = secRows[idx] || {};
        const m = measureV0006TestCaseBlockPart(doc, row);
        const keepNeed = Math.min(m.total, Math.max(m.tcOnly + 24, m.keepMin));

        if (getPageNo() !== headerPageNo) {
          ensureSpace(doc, 24 + keepNeed, 70);
          drawV0006TcTableHeader(doc);
          headerPageNo = getPageNo();
        } else {
          const broke = ensureSpace(doc, keepNeed, 70);
          if (broke) {
            drawV0006TcTableHeader(doc);
            headerPageNo = getPageNo();
          }
        }

        drawV0006TcRow(doc, row);
        drawEnvBlockV0006Part(doc, row);
        await drawProcedureCriteria(doc, row);
        await drawRemarkAndImages(doc, row, fileCache);
        doc.moveDown(0.2);
      }
    }

    renderTocV0006(doc, tocEntries, tocStartNo, tocPageCount);
    const drawFooter = useTemplate ? boolish(req.query?.drawFooter, false) : true;
    decorateV0006(doc, { coverHasFooter: false, drawTopBand: !useTemplate, drawFooter });

    doc.end();
  } catch (err) {
    console.error("[partTestReport] generate failed:", err);
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

router.get(ROUTE_PATHS, verifyTokenFromQuery, authEither, handlePartReport);
router.post(ROUTE_PATHS, verifyTokenFromQuery, authEither, handlePartReport);

export default router;
