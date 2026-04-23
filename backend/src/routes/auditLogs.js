// backend/src/routes/auditLogs.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import { logAction } from "../utils/logAction.js";
import * as models from "../models/index.js";

const router = express.Router();

/* ---------------- config ---------------- */
const MAX_ACTION_LEN = 48;
const MAX_RESOURCE_LEN = 64;
const MAX_RECORDID_LEN = 64;
const MAX_NOTE_LEN = 2000;
const MAX_STATUS_LEN = 64;

// meta 控制（避免巨大/深層物件塞爆 DB）
const META_MAX_DEPTH = 4;
const META_MAX_KEYS = 40;
const META_MAX_ARR = 30;
const META_MAX_STRING = 2000;
const META_MAX_JSON_CHARS = 8000;

// 防刷（記憶體版：重啟會清空；多實例需要用 Redis 才準）
const RL_WINDOW_MS = 60_000;
const RL_MAX_EVENTS_PER_WINDOW = 120; // 每位使用者/每分鐘最多 120 筆
const DEDUPE_MS = 2500; // 2.5s 內相同 key 視為重複

/* ---------------- helpers ---------------- */
const clean = (v) => String(v ?? "").trim();
const now = () => Date.now();

function clampInt(v, def, min, max) {
  const n = Number(v);
  const x = Number.isFinite(n) ? Math.floor(n) : def;
  return Math.max(min, Math.min(max, x));
}

function limitString(v, maxLen) {
  const s = clean(v);
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function safeId(v) {
  // allow: number / string
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.length > MAX_RECORDID_LEN ? s.slice(0, MAX_RECORDID_LEN) : s;
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  const ip =
    (typeof xff === "string" && xff.split(",")[0]?.trim()) ||
    (Array.isArray(xff) && xff[0]) ||
    req.ip ||
    req.socket?.remoteAddress ||
    "";
  return String(ip || "").trim();
}

function redactKey(k) {
  const key = String(k || "").toLowerCase();
  return (
    key.includes("password") ||
    key.includes("passwd") ||
    key.includes("token") ||
    key.includes("authorization") ||
    key.includes("cookie") ||
    key.includes("secret") ||
    key.includes("jwt")
  );
}

function sanitizeMeta(input, depth = 0) {
  if (input === null || input === undefined) return null;

  // depth limit
  if (depth >= META_MAX_DEPTH) return "[Truncated:depth]";

  const t = typeof input;

  // primitives
  if (t === "string") {
    const s = input;
    return s.length > META_MAX_STRING ? s.slice(0, META_MAX_STRING) : s;
  }
  if (t === "number" || t === "boolean") return input;

  // dates
  if (input instanceof Date) return input.toISOString();

  // arrays
  if (Array.isArray(input)) {
    const arr = input.slice(0, META_MAX_ARR);
    return arr.map((v) => sanitizeMeta(v, depth + 1));
  }

  // objects
  if (t === "object") {
    const out = {};
    const keys = Object.keys(input).slice(0, META_MAX_KEYS);

    for (const k of keys) {
      if (redactKey(k)) {
        out[k] = "[REDACTED]";
        continue;
      }
      const v = input[k];
      out[k] = sanitizeMeta(v, depth + 1);
    }
    return out;
  }

  // functions / symbols / bigint...
  return String(input);
}

function shrinkMeta(metaObj) {
  const sanitized = sanitizeMeta(metaObj);
  // 最後再控制 JSON 長度
  try {
    const s = JSON.stringify(sanitized);
    if (s && s.length > META_MAX_JSON_CHARS) {
      return {
        _notice: "[Truncated:json_size]",
        _len: s.length,
      };
    }
  } catch {
    return { _notice: "[Invalid meta: non-serializable]" };
  }
  return sanitized;
}

/* ---------------- in-memory limiter / dedupe ---------------- */
const rlMap = new Map(); // key -> { ts, count }
const dedupeMap = new Map(); // key -> lastTs

function rateLimitKey(actorId, ip) {
  return actorId ? `u:${actorId}` : `ip:${ip || "unknown"}`;
}

function allowLog(key) {
  const t = now();
  const rec = rlMap.get(key);
  if (!rec) {
    rlMap.set(key, { ts: t, count: 1 });
    return true;
  }
  if (t - rec.ts > RL_WINDOW_MS) {
    rlMap.set(key, { ts: t, count: 1 });
    return true;
  }
  rec.count += 1;
  rlMap.set(key, rec);
  return rec.count <= RL_MAX_EVENTS_PER_WINDOW;
}

function isDuplicate(dedupeKey) {
  const t = now();
  const last = dedupeMap.get(dedupeKey);
  if (last && t - last < DEDUPE_MS) return true;
  dedupeMap.set(dedupeKey, t);
  return false;
}

function normalizeAction(action) {
  // 允許自訂，但限制字元與長度；常見行為可用 PAGE_VIEW / CLICK / SUBMIT / ERROR...
  let s = limitString(action, MAX_ACTION_LEN).toUpperCase();
  s = s.replace(/\s+/g, "_").replace(/[^A-Z0-9._:-]/g, "");
  return s || "UI_ACTION";
}

function normalizeResource(resource) {
  let s = limitString(resource, MAX_RESOURCE_LEN);
  s = s.replace(/\s+/g, " ").trim();
  return s || "ui";
}

function requireLogViewer(req, res, next) {
  const role = String(req.user?.role || "").toLowerCase();
  if (!["admin", "supervisor"].includes(role)) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }
  next();
}

// 嘗試找出 AuditLog -> User 的關聯別名（避免你之前遇到 alias mismatch）
function inferActorAlias() {
  const AuditLog = models.AuditLog;
  if (!AuditLog?.associations) return null;
  const keys = Object.keys(AuditLog.associations);
  // 常見 alias：actor / user / createdByUser...
  if (keys.includes("actor")) return "actor";
  if (keys.includes("user")) return "user";
  // 找任何 target 是 User 的 association
  for (const k of keys) {
    const a = AuditLog.associations[k];
    if (a?.target?.name === "User") return k;
  }
  return null;
}

/* ---------------- routes ---------------- */

/**
 * ✅ 前端 UI 行為寫入系統日誌
 * POST /api/audit-logs/ui
 *
 * 支援兩種 body：
 * 1) 單筆：{ action, resource, recordId, note, status, meta }
 * 2) 批次：{ events: [ { action, resource, recordId, note, status, meta }, ... ] }
 */
router.post("/ui", authMiddleware, async (req, res) => {
  try {
    // content-type 防呆（避免亂打）
    if (req.headers["content-type"] && !String(req.headers["content-type"]).includes("application/json")) {
      return res.status(415).json({ ok: false, message: "Content-Type must be application/json" });
    }

    const actorId = req.user?.id || null;
    const ip = getClientIp(req);
    const rlKey = rateLimitKey(actorId, ip);

    if (!allowLog(rlKey)) {
      return res.status(429).json({ ok: false, message: "Too many log events" });
    }

    const ua = String(req.headers["user-agent"] || "");
    const referer = String(req.headers["referer"] || "");
    const origin = String(req.headers["origin"] || "");

    const baseMeta = {
      source: "frontend",
      ua,
      ip,
      referer,
      origin,
      // 也可補一些常用資訊（前端可傳 path / routeName，這裡先留位置）
    };

    const body = req.body || {};
    const events = Array.isArray(body?.events) ? body.events : [body];

    // 控制一次最多幾筆，避免炸 DB
    const sliced = events.slice(0, 50);

    let logged = 0;
    let skipped = 0;

    for (const ev of sliced) {
      const action = normalizeAction(ev?.action ?? "PAGE_VIEW");
      const resource = normalizeResource(ev?.resource ?? "ui");

      const recordId = safeId(ev?.recordId);
      const note = limitString(ev?.note ?? "", MAX_NOTE_LEN);
      const status = limitString(ev?.status ?? "", MAX_STATUS_LEN) || null;

      const meta = shrinkMeta({
        ...(ev?.meta && typeof ev.meta === "object" ? ev.meta : {}),
        ...baseMeta,
      });

      // 去重 key（可依需求調整：例如加入 route/path）
      const dedupeKey = `${actorId || "anon"}|${action}|${resource}|${recordId || ""}|${note.slice(0, 40)}`;
      if (isDuplicate(dedupeKey)) {
        skipped += 1;
        continue;
      }

      await logAction(actorId, action, resource, {
        recordId,
        note,
        status,
        meta,
      });

      logged += 1;
    }

    res.json({ ok: true, logged, skipped, received: events.length, accepted: sliced.length });
  } catch (e) {
    console.error("POST /audit-logs/ui error:", e);
    res.status(500).json({ ok: false, message: "Failed to log ui action" });
  }
});

/**
 * ✅ 查詢系統日誌（給後台/SystemLogs用）
 * GET /api/audit-logs?kw=&action=&resource=&actorId=&status=&from=&to=&page=&pageSize=&withMeta=
 * - 預設不回傳 meta（避免巨大）
 * - 僅 admin/supervisor 可查
 */
router.get("/", authMiddleware, requireLogViewer, async (req, res) => {
  try {
    const AuditLog = models.AuditLog;
    if (!AuditLog) return res.status(500).json({ ok: false, message: "AuditLog model not found" });

    const kw = clean(req.query.kw || "");
    const action = clean(req.query.action || "");
    const resource = clean(req.query.resource || "");
    const actorId = clean(req.query.actorId || "");
    const status = clean(req.query.status || "");
    const from = clean(req.query.from || "");
    const to = clean(req.query.to || "");

    const page = clampInt(req.query.page, 1, 1, 10_000);
    const pageSize = clampInt(req.query.pageSize, 50, 1, 200);
    const withMeta = String(req.query.withMeta || "").trim() === "1";

    const where = {};
    if (action) where.action = { [Op.like]: `%${action}%` };
    if (resource) where.resource = { [Op.like]: `%${resource}%` };
    if (actorId) where.actorId = actorId;
    if (status) where.status = { [Op.like]: `%${status}%` };

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
    }

    if (kw) {
      where[Op.or] = [
        { action: { [Op.like]: `%${kw}%` } },
        { resource: { [Op.like]: `%${kw}%` } },
        { recordId: { [Op.like]: `%${kw}%` } },
        { note: { [Op.like]: `%${kw}%` } },
      ];
    }

    const actorAlias = inferActorAlias();

    const attributes = withMeta
      ? undefined
      : { exclude: ["meta"] }; // meta 通常很大，列表先不帶

    const include = [];
    if (models.User && actorAlias) {
      include.push({
        model: models.User,
        as: actorAlias,
        attributes: ["id", "username", "role"],
        required: false,
      });
    }

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      include,
      attributes,
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    res.json({
      ok: true,
      page,
      pageSize,
      count,
      rows,
      actorAlias: actorAlias || null,
    });
  } catch (e) {
    console.error("GET /audit-logs error:", e);
    res.status(500).json({ ok: false, message: "Failed to fetch audit logs" });
  }
});

/**
 * ✅ 讀取單筆（含 meta）
 * GET /api/audit-logs/:id
 */
router.get("/:id", authMiddleware, requireLogViewer, async (req, res) => {
  try {
    const AuditLog = models.AuditLog;
    if (!AuditLog) return res.status(500).json({ ok: false, message: "AuditLog model not found" });

    const id = req.params.id;
    const actorAlias = inferActorAlias();

    const include = [];
    if (models.User && actorAlias) {
      include.push({
        model: models.User,
        as: actorAlias,
        attributes: ["id", "username", "role"],
        required: false,
      });
    }

    const row = await AuditLog.findByPk(id, { include });
    if (!row) return res.status(404).json({ ok: false, message: "Not found" });

    res.json({ ok: true, row, actorAlias: actorAlias || null });
  } catch (e) {
    console.error("GET /audit-logs/:id error:", e);
    res.status(500).json({ ok: false, message: "Failed to fetch audit log" });
  }
});

export default router;
