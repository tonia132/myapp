// backend/src/routes/logs.js
import express from "express";
import { Op, fn, col, literal } from "sequelize";
import { AuditLog, User } from "../models/index.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRole from "../middleware/roleMiddleware.js";

const router = express.Router();

/* =========================================================
   ✅ Tunables / Guards（避免前端塞爆 DB / 伺服器）
========================================================= */
const MAX_PAGE = 100_000;
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 10;

const MAX_KEYWORD_LEN = 120;
const MAX_RESOURCE_LEN = 120;
const MAX_ACTION_LEN = 64;
const MAX_TARGET_TYPE_LEN = 64;
const MAX_DESC_LEN = 500;
const MAX_DETAIL_LEN = 32_000; // detail/JSON 字串上限（避免爆欄位/爆封包）

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const clean = (v) => String(v ?? "").trim();

const toInt = (v, def = 0) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() ||
    req.ip ||
    ""
  );
}

function safeSlice(s, max) {
  const str = String(s ?? "");
  return str.length > max ? str.slice(0, max) : str;
}

function safeJsonStringify(x, fallback = "{}") {
  try {
    if (typeof x === "string") return x;
    if (x == null) return fallback;
    return JSON.stringify(x);
  } catch {
    return fallback;
  }
}

function isYYYYMMDD(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ""))) return false;
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const [yy, mm, dd] = s.split("-").map((x) => Number(x));
  return d.getFullYear() === yy && d.getMonth() + 1 === mm && d.getDate() === dd;
}

function parseDateMaybe(s, asEnd = false) {
  if (!s) return null;

  const raw = String(s).trim();
  let d = null;

  // YYYY-MM-DD
  if (isYYYYMMDD(raw)) {
    d = new Date(`${raw}T00:00:00`);
    if (asEnd) d = new Date(`${raw}T23:59:59.999`);
    return d;
  }

  // ISO / other parseable formats
  const tmp = new Date(raw);
  if (!Number.isNaN(tmp.getTime())) return tmp;

  return null;
}

function parseDateRange(startDate, endDate) {
  if (!startDate && !endDate) return { ok: true, value: null };

  const s = parseDateMaybe(startDate, false);
  const e = parseDateMaybe(endDate, true);

  if (startDate && !s) return { ok: false, message: "startDate 格式無效" };
  if (endDate && !e) return { ok: false, message: "endDate 格式無效" };

  // 允許只給 start / end
  if (s && e && e < s) return { ok: false, message: "endDate 必須晚於 startDate" };

  if (s && e) return { ok: true, value: { [Op.between]: [s, e] } };
  if (s) return { ok: true, value: { [Op.gte]: s } };
  return { ok: true, value: { [Op.lte]: e } };
}

function parseListCsv(raw, maxLen = 50) {
  const s = clean(raw);
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, maxLen);
}

function buildWhere(q, { includeActorLike = false } = {}) {
  const where = {};

  // action: 支援逗號多選
  if (q.action) {
    const list = parseListCsv(q.action, 100).map((x) => safeSlice(x, MAX_ACTION_LEN));
    if (list.length) where.action = list.length === 1 ? list[0] : { [Op.in]: list };
  }

  // actorId/targetId：容錯處理
  if (q.actorId) {
    const id = toInt(q.actorId, 0);
    if (id > 0) where.actorId = id;
  }
  if (q.targetType) where.targetType = safeSlice(clean(q.targetType), MAX_TARGET_TYPE_LEN) || undefined;
  if (q.targetId) {
    const id = toInt(q.targetId, 0);
    if (id > 0) where.targetId = id;
  }

  if (q.resource) {
    const r = safeSlice(clean(q.resource), MAX_RESOURCE_LEN);
    if (r) where.resource = { [Op.like]: `%${r}%` };
  }

  // 日期區間
  const dr = parseDateRange(q.startDate, q.endDate);
  if (!dr.ok) return { _error: dr.message };
  if (dr.value) where.createdAt = dr.value;

  // keyword：限制長度，避免 where 太肥
  const keyword = safeSlice(clean(q.keyword), MAX_KEYWORD_LEN);
  if (keyword) {
    const kw = `%${keyword}%`;

    const or = [
      { resource: { [Op.like]: kw } },
      { targetType: { [Op.like]: kw } },
      { description: { [Op.like]: kw } },
      { detail: { [Op.like]: kw } }, // ✅ 欄位是 detail
      { ip: { [Op.like]: kw } },
      { action: { [Op.like]: kw } },
    ];

    // ✅ 只有 include actor 時，才能用 $actor.xxx$
    if (includeActorLike) {
      or.push({ "$actor.username$": { [Op.like]: kw } });
      or.push({ "$actor.name$": { [Op.like]: kw } });
    }

    where[Op.or] = or;
  }

  return where;
}

/* =========================================================
   ✅ UI / Page 行為寫入（登入者可寫）
   POST /api/logs/ui
========================================================= */
router.post("/ui", authMiddleware, async (req, res) => {
  try {
    const actorId = req.user?.id || null;

    const {
      action = "PAGE_VIEW",
      resource = "ui",
      targetType = null,
      targetId = null,
      description = "",
      note = "",
      detail = null,
      meta = null,
      details = null,
    } = req.body || {};

    const ip = getClientIp(req);
    const ua = req.headers["user-agent"] || "";

    const safeAction = safeSlice(clean(action || "UI_ACTION") || "UI_ACTION", MAX_ACTION_LEN);
    const safeResource = safeSlice(clean(resource || "ui") || "ui", MAX_RESOURCE_LEN);

    const raw = detail ?? details ?? meta ?? {};
    let detailStr = safeJsonStringify(raw, "{}");
    detailStr = safeSlice(detailStr, MAX_DETAIL_LEN);

    const desc = safeSlice(clean(note || description || ""), MAX_DESC_LEN);

    await AuditLog.create({
      actorId,
      action: safeAction,
      resource: safeResource,
      targetType: targetType != null ? safeSlice(clean(targetType), MAX_TARGET_TYPE_LEN) : null,
      targetId: targetId != null ? toInt(targetId, null) : null,
      description: desc,
      detail: detailStr,
      ip,
      // ✅ 建議：把 UA 放進 detail（不額外加欄位也能追）
      // 若你 AuditLog 有 ua 欄位就改成 ua: ua
      createdAt: new Date(),
      // updatedAt 交給 sequelize 自動
    });

    // （可選）也可記一筆更完整：把 ua 補進 detail
    // 但避免每次多一次 update，這裡不做

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ 寫入 UI 日誌失敗:", err);
    res.status(500).json({ ok: false, message: "寫入失敗", error: err?.message || String(err) });
  }
});

/* =========================================================
   📋 查詢（管理員限定）
   GET /api/logs
   query:
     - page, limit
     - action (csv)
     - actorId
     - targetType, targetId
     - resource
     - startDate, endDate
     - keyword
     - light=1  (可選：不帶 detail 省流量)
========================================================= */
router.get("/", authMiddleware, authorizeRole("admin"), async (req, res) => {
  try {
    const page = clamp(toInt(req.query.page, 1), 1, MAX_PAGE);
    const limit = clamp(toInt(req.query.limit, DEFAULT_LIMIT), 1, MAX_LIMIT);
    const offset = (page - 1) * limit;

    const include = [
      {
        model: User,
        as: "actor",
        attributes: ["id", "username", "name", "role"],
        required: false,
      },
    ];

    const where = buildWhere(req.query, { includeActorLike: true });
    if (where?._error) {
      return res.status(400).json({ message: where._error });
    }

    const light = String(req.query.light || "0") === "1";
    const attributes = light
      ? { exclude: ["detail"] } // ✅ detail 常最大
      : undefined;

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      attributes,
      offset,
      limit,
      order: [["createdAt", "DESC"], ["id", "DESC"]],
      include,
      distinct: true, // ✅ 有 include 時避免 count 重複
      subQuery: false, // ✅ 讓 $actor.xxx$ LIKE 能正常運作
    });

    res.json({
      total: count,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(count / limit)),
      logs: rows,
    });
  } catch (err) {
    console.error("❌ 取得操作日誌失敗:", err);
    res.status(500).json({ message: "無法取得操作日誌", error: err?.message || String(err) });
  }
});

/* =========================================================
   ✅ distinct（actions / actors / targetTypes）
   GET /api/logs/distinct
========================================================= */
router.get("/distinct", authMiddleware, authorizeRole("admin"), async (_req, res) => {
  try {
    // actions
    const actionsRaw = await AuditLog.findAll({
      attributes: [[fn("DISTINCT", col("action")), "action"]],
      order: [[col("action"), "ASC"]],
      raw: true,
    });
    const actions = actionsRaw.map((r) => r.action).filter(Boolean);

    // targetTypes（可給前端下拉）
    const typesRaw = await AuditLog.findAll({
      attributes: [[fn("DISTINCT", col("targetType")), "targetType"]],
      where: { targetType: { [Op.ne]: null } },
      order: [[col("targetType"), "ASC"]],
      raw: true,
    });
    const targetTypes = typesRaw.map((r) => r.targetType).filter(Boolean);

    // actors：只列出真的有 log 的人
    const actors = await User.findAll({
      attributes: ["id", "username", "name", "role"],
      include: [{ model: AuditLog, as: "auditLogs", attributes: [], required: true }],
      order: [["username", "ASC"]],
    });

    res.json({ actions, targetTypes, actors });
  } catch (err) {
    console.error("❌ 取得 distinct 失敗:", err);
    res.status(500).json({ message: "無法取得選單資料", error: err?.message || String(err) });
  }
});

/* =========================================================
   📤 export CSV（管理員）
   GET /api/logs/export
   query 同 GET /api/logs
   - 最大 20,000 筆（避免爆記憶體/等待太久）
   - 用串流寫入（res.write）降低 RAM
========================================================= */
router.get("/export", authMiddleware, authorizeRole("admin"), async (req, res) => {
  try {
    const where = buildWhere(req.query, { includeActorLike: true });
    if (where?._error) {
      return res.status(400).json({ message: where._error });
    }

    const MAX_EXPORT = 20_000;

    const rows = await AuditLog.findAll({
      where,
      limit: MAX_EXPORT,
      order: [["createdAt", "DESC"], ["id", "DESC"]],
      include: [{ model: User, as: "actor", attributes: ["id", "username", "name", "role"], required: false }],
      subQuery: false,
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="audit-logs.csv"`);

    const header = [
      "createdAt",
      "action",
      "actorId",
      "actorName",
      "role",
      "resource",
      "targetType",
      "targetId",
      "description",
      "detail",
      "ip",
    ];

    const esc = (v) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    // ✅ BOM：Excel 不亂碼
    res.write("\uFEFF" + header.join(",") + "\n");

    for (const r of rows) {
      const line = [
        r.createdAt?.toISOString?.() ? r.createdAt.toISOString() : (r.createdAt ? String(r.createdAt) : ""),
        r.action || "",
        r.actor?.id || r.actorId || "",
        r.actor?.name || r.actor?.username || "",
        r.actor?.role || "",
        r.resource || "",
        r.targetType || "",
        r.targetId || "",
        r.description || "",
        r.detail || "",
        r.ip || "",
      ]
        .map(esc)
        .join(",");

      res.write(line + "\n");
    }

    res.end();
  } catch (err) {
    console.error("❌ 匯出日誌失敗:", err);
    res.status(500).json({ message: "匯出失敗", error: err?.message || String(err) });
  }
});

export default router;

/* =========================================================
   ✅ 建議你加的 DB Index（效能差很多）
   - createdAt
   - action
   - actorId
   - targetType + targetId
   - resource (若常查)
   - ip (若常查)
   detail/description 做 LIKE 很吃力，真要全文搜尋建議上 FULLTEXT 或外部 search
========================================================= */
