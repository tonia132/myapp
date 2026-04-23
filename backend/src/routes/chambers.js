// backend/src/routes/chambers.js
import express from "express";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import authMiddleware from "../middleware/authMiddleware.js";
import { logAction } from "../utils/logAction.js";

const router = express.Router();

/* ───────────────────────────────────────────────────────────
   路徑：以「這支檔案」為基準，可靠跨平台
   檔案：backend/public/files/chambers.csv
────────────────────────────────────────────────────────── */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE_PATH = path.resolve(__dirname, "..", "..", "public", "files", "chambers.csv");
const DIR_PATH = path.dirname(FILE_PATH);
const HEADER = ["name", "model", "project", "item", "tester", "start", "end"];

/* ───────────────────────────────────────────────────────────
   行為控制（可用 env 調整）
────────────────────────────────────────────────────────── */
const READ_PUBLIC =
  String(process.env.CHAMBERS_READ_PUBLIC ?? "true").toLowerCase() === "true"; // GET / 是否需要登入
const ENABLE_BACKUP =
  String(process.env.CHAMBERS_BACKUP ?? "true").toLowerCase() === "true"; // 每次 save 是否備份
const MAX_FILE_BYTES = Number(process.env.CHAMBERS_MAX_FILE_BYTES || 2_000_000) || 2_000_000; // 2MB
const MAX_ROWS = Number(process.env.CHAMBERS_MAX_ROWS || 5000) || 5000;
const MAX_NOTE_FIELD = 200; // 每格最大字數（你可調）

/* ───────────────────────────────────────────────────────────
   小工具：確保資料夾/檔案存在（具抗併發）
────────────────────────────────────────────────────────── */
async function ensureFile() {
  await fs.mkdir(DIR_PATH, { recursive: true });
  try {
    await fs.access(FILE_PATH);
  } catch {
    // 併發情境用 wx，避免兩個人同時 create
    const init = HEADER.join(",") + "\n";
    try {
      await fs.writeFile(FILE_PATH, init, { encoding: "utf8", flag: "wx" });
    } catch (e) {
      // 若已被別人建立，忽略
      if (e?.code !== "EEXIST") throw e;
    }
  }
}

/* ───────────────────────────────────────────────────────────
   CSV escaping / building
────────────────────────────────────────────────────────── */
function esc(v) {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCSV(rows) {
  const lines = [HEADER.join(",")];
  for (const r of rows) {
    lines.push(HEADER.map((k) => esc(r[k])).join(","));
  }
  return lines.join("\n") + "\n";
}

/* ───────────────────────────────────────────────────────────
   CSV parsing (no deps)
────────────────────────────────────────────────────────── */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // skip
      } else {
        field += c;
      }
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function csvToRows(text) {
  const all = parseCSV(text);
  if (!all.length) return [];
  const header = all[0].map((h) => h?.trim());
  const idx = (k) => header.indexOf(k);

  const out = [];
  for (let i = 1; i < all.length; i++) {
    const cols = all[i];
    if (!cols || !cols.some((x) => (x ?? "").trim() !== "")) continue;

    const obj = {};
    for (const k of HEADER) obj[k] = (cols[idx(k)] ?? "").trim();
    out.push(obj);
  }
  return out;
}

/* ───────────────────────────────────────────────────────────
   Validation / Sanitization
────────────────────────────────────────────────────────── */
const clean = (v) => String(v ?? "").trim();
const lower = (v) => clean(v).toLowerCase();

function clampStr(s, max = MAX_NOTE_FIELD) {
  const v = clean(s);
  if (!v) return "";
  return v.length > max ? v.slice(0, max) : v;
}

function stripControlChars(s) {
  // 去除控制字元，避免 CSV 注入/破壞
  return String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, "");
}

// 防 Excel CSV 公式注入：開頭是 = + - @ 時，前面加 '
function preventExcelFormulaInjection(s) {
  const v = String(s ?? "");
  return /^[=+\-@]/.test(v) ? `'${v}` : v;
}

function normCell(v) {
  let s = stripControlChars(v);
  s = clean(s);
  s = s.replace(/\s+/g, " "); // 多空白折疊
  s = clampStr(s, MAX_NOTE_FIELD);
  s = preventExcelFormulaInjection(s);
  return s;
}

// 支援: ISO、YYYY-MM-DD、YYYY-MM-DD HH:mm、YYYY/MM/DD 等
function normalizeDateLike(v) {
  const s = clean(v);
  if (!s) return "";

  // 先試 Date 解析（ISO 或可解析格式）
  const t1 = Date.parse(s);
  if (!Number.isNaN(t1)) {
    const d = new Date(t1);
    // 你也可以改成回 ISO；這裡回 "YYYY-MM-DD HH:mm"
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  }

  // 再試手工：YYYY-MM-DD HH:mm / YYYY/MM/DD HH:mm
  const m = s.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (m) {
    const [_, yy, mm, dd, hh = "00", mi = "00"] = m;
    const pad = (n) => String(n).padStart(2, "0");
    return `${yy}-${pad(mm)}-${pad(dd)} ${pad(hh)}:${pad(mi)}`;
  }

  // 不可解析就原樣（但清洗）
  return normCell(s);
}

function sanitizeRow(r) {
  const obj = {};
  for (const k of HEADER) {
    if (k === "start" || k === "end") obj[k] = normalizeDateLike(r?.[k]);
    else obj[k] = normCell(r?.[k]);
  }
  return obj;
}

/* ───────────────────────────────────────────────────────────
   Meta / ETag / Concurrency
────────────────────────────────────────────────────────── */
function buildEtag(stat) {
  // mtimeMs + size 足夠做樂觀鎖
  const a = Number(stat?.mtimeMs || 0);
  const b = Number(stat?.size || 0);
  return `"${b}-${a}"`;
}

async function readAll() {
  await ensureFile();
  const stat = await fs.stat(FILE_PATH);
  if (stat.size > MAX_FILE_BYTES) {
    const err = new Error("FILE_TOO_LARGE");
    err.code = "FILE_TOO_LARGE";
    throw err;
  }
  const csv = await fs.readFile(FILE_PATH, "utf8");
  const rows = csvToRows(csv);
  return { rows, stat, etag: buildEtag(stat) };
}

/* ───────────────────────────────────────────────────────────
   Write lock (in-process)
────────────────────────────────────────────────────────── */
let writeChain = Promise.resolve();
function withWriteLock(fn) {
  const next = writeChain.then(fn, fn);
  // 避免 chain 永久卡死
  writeChain = next.catch(() => {});
  return next;
}

function tsName() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}`;
}

async function backupCurrent() {
  if (!ENABLE_BACKUP) return;
  try {
    await fs.mkdir(path.join(DIR_PATH, "history"), { recursive: true });
    const b = path.join(DIR_PATH, "history", `chambers_${tsName()}.csv`);
    // 來源可能不存在（首次），所以先 ensureFile
    await ensureFile();
    await fs.copyFile(FILE_PATH, b);
  } catch {
    // 備份失敗不阻擋主流程
  }
}

async function atomicWriteCsv(csvText) {
  await ensureFile();
  const tmp = FILE_PATH + ".tmp";
  await fs.writeFile(tmp, csvText, "utf8");
  // Windows/跨平台：rename 是最常用原子替換方式
  await fs.rename(tmp, FILE_PATH);
}

/* ───────────────────────────────────────────────────────────
   Filtering helpers
────────────────────────────────────────────────────────── */
function toTime(v) {
  const s = clean(v);
  if (!s) return null;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  // 若是 "YYYY-MM-DD HH:mm"
  const t2 = Date.parse(s.replace(" ", "T"));
  if (!Number.isNaN(t2)) return t2;
  return null;
}

function matchKw(row, kw) {
  if (!kw) return true;
  const s = lower(kw);
  return HEADER.some((k) => lower(row?.[k]).includes(s));
}

/* ========================
   📋 取得 Chamber 排程列表
   GET /api/chambers
   支援 query:
   - kw= 關鍵字
   - name/project/tester/model/item 精準或模糊
   - from=, to= 依 start/end 範圍粗略過濾
======================== */
router.get("/", ...(READ_PUBLIC ? [] : [authMiddleware]), async (req, res) => {
  try {
    const { rows, stat, etag } = await readAll();

    const kw = clean(req.query.kw || "");
    const qName = clean(req.query.name || "");
    const qProj = clean(req.query.project || "");
    const qTester = clean(req.query.tester || "");
    const qModel = clean(req.query.model || "");
    const qItem = clean(req.query.item || "");

    const fromT = toTime(req.query.from || "");
    const toT = toTime(req.query.to || "");

    let out = rows;

    if (kw) out = out.filter((r) => matchKw(r, kw));
    if (qName) out = out.filter((r) => lower(r.name).includes(lower(qName)));
    if (qProj) out = out.filter((r) => lower(r.project).includes(lower(qProj)));
    if (qTester) out = out.filter((r) => lower(r.tester).includes(lower(qTester)));
    if (qModel) out = out.filter((r) => lower(r.model).includes(lower(qModel)));
    if (qItem) out = out.filter((r) => lower(r.item).includes(lower(qItem)));

    if (fromT || toT) {
      out = out.filter((r) => {
        const sT = toTime(r.start);
        const eT = toTime(r.end);
        // 沒日期就不做篩選
        if (!sT && !eT) return true;
        const a = sT ?? eT ?? 0;
        const b = eT ?? sT ?? 0;
        if (fromT && b < fromT) return false;
        if (toT && a > toT) return false;
        return true;
      });
    }

    res.setHeader("ETag", etag);
    res.json({
      rows: out,
      meta: {
        etag,
        updatedAt: stat.mtime,
        size: stat.size,
        total: rows.length,
        filtered: out.length,
      },
    });
  } catch (err) {
    console.error("❌ 無法讀取排程:", err);
    if (err?.code === "FILE_TOO_LARGE") {
      return res.status(413).json({ error: "CSV 檔案過大，請清理或改用資料庫" });
    }
    res.status(500).json({ error: "讀取 CSV 檔案失敗" });
  }
});

/* ========================
   ⬇️ 下載 CSV 原檔
   GET /api/chambers/download?bom=1
======================== */
router.get("/download", ...(READ_PUBLIC ? [] : [authMiddleware]), async (req, res) => {
  try {
    await ensureFile();
    const csv = await fs.readFile(FILE_PATH, "utf8");
    const bom = String(req.query.bom || "") === "1";
    const data = bom ? "\ufeff" + csv : csv;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="chambers.csv"');

    // 審計（不阻塞）
    const actorId = req.user?.id || null;
    logAction(actorId, "DOWNLOAD", "chambers", { ip: getClientIp(req), size: Buffer.byteLength(data) }).catch(
      () => {}
    );

    res.send(data);
  } catch (err) {
    console.error("❌ 下載失敗:", err);
    res.status(500).json({ error: "下載失敗" });
  }
});

/* ========================
   💾 儲存 Chamber 排程（全量覆寫）
   POST /api/chambers/save
   body 支援兩種：
   1) 直接 array: [{...}, ...]
   2) { rows: [...], meta: { etag } }
   - 樂觀鎖：支援 If-Match header 或 meta.etag
======================== */
router.post("/save", authMiddleware, async (req, res) => {
  return withWriteLock(async () => {
    try {
      const actorId = req.user?.id || null;
      const ip = getClientIp(req);

      // content-type 防呆
      if (req.headers["content-type"] && !String(req.headers["content-type"]).includes("application/json")) {
        return res.status(415).json({ error: "Content-Type must be application/json" });
      }

      const body = req.body;
      const rowsRaw = Array.isArray(body) ? body : body?.rows;
      const clientEtag =
        req.headers["if-match"] || (Array.isArray(body) ? null : body?.meta?.etag) || null;

      if (!Array.isArray(rowsRaw)) {
        return res.status(400).json({ error: "資料格式錯誤，應為陣列或 { rows: [...] }" });
      }

      if (rowsRaw.length > MAX_ROWS) {
        return res.status(413).json({ error: `資料筆數過多（>${MAX_ROWS}），請分批或改用資料庫` });
      }

      // 先讀現況拿 etag，做樂觀鎖
      const { stat, etag: currentEtag } = await readAll();
      if (clientEtag && String(clientEtag).trim() !== String(currentEtag).trim()) {
        return res.status(409).json({
          error: "資料已被其他人更新，請重新載入後再儲存",
          meta: { etag: currentEtag, updatedAt: stat.mtime, size: stat.size },
        });
      }

      // sanitize/validate
      const rows = rowsRaw.map((r) => sanitizeRow(r));

      const csv = rowsToCSV(rows);

      // 再檢查檔案大小（避免寫入超大）
      if (Buffer.byteLength(csv, "utf8") > MAX_FILE_BYTES) {
        return res.status(413).json({ error: "儲存內容過大，請清理或改用資料庫" });
      }

      // 備份舊檔（不阻塞主流程）
      await backupCurrent();

      // 原子寫入
      await atomicWriteCsv(csv);

      const newStat = await fs.stat(FILE_PATH);
      const newEtag = buildEtag(newStat);

      logAction(actorId, "SAVE", "chambers", {
        ip,
        rows: rows.length,
        bytes: newStat.size,
      }).catch(() => {});

      res.setHeader("ETag", newEtag);
      res.json({
        success: true,
        message: "排程已儲存",
        meta: { etag: newEtag, updatedAt: newStat.mtime, size: newStat.size },
      });
    } catch (err) {
      console.error("❌ 無法儲存排程:", err);
      res.status(500).json({ error: "儲存 CSV 失敗" });
    }
  });
});

export default router;
