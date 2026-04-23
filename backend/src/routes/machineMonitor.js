// backend/src/routes/monitor.js
import express from "express";
import jwt from "jsonwebtoken";
import authMiddleware from "../middleware/authMiddleware.js";
import { logAction } from "../utils/logAction.js";

const router = express.Router();

/* =========================================================
   ✅ Settings (env)
========================================================= */
const JWT_SECRET = process.env.JWT_SECRET || "";
const REQUIRE_AUTH =
  String(process.env.MONITOR_REQUIRE_AUTH ?? "false").toLowerCase() === "true"; // ✅ 預設不強制（你可改 true）
const ENABLE_SIM_IN_PROD =
  String(process.env.MONITOR_SIM_ENABLE_IN_PROD ?? "false").toLowerCase() === "true";

const LOG_ALARM =
  String(process.env.MONITOR_LOG_ALARM ?? "false").toLowerCase() === "true";

const DEFAULT_MIN_INTERVAL_MS = Math.max(
  50,
  Number.parseInt(process.env.MONITOR_MIN_INTERVAL_MS || "300", 10) || 300
);

const MAX_HISTORY = Math.max(
  10,
  Number.parseInt(process.env.MONITOR_MAX_HISTORY || "3600", 10) || 3600
); // 最多 3600 點
const MAX_INTERVAL_SEC = Math.max(
  1,
  Number.parseInt(process.env.MONITOR_MAX_INTERVAL_SEC || "60", 10) || 60
); // 歷史點間隔上限 60 秒
const MAX_IDS = Math.max(
  1,
  Number.parseInt(process.env.MONITOR_MAX_IDS || "50", 10) || 50
); // 批次查詢最多 50 台

/* =========================================================
   ✅ Small utils
========================================================= */
const clean = (v) => String(v ?? "").trim();

const toInt = (v, def = 0) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

const toNum = (v, def = undefined) => {
  if (v === undefined || v === null || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() ||
    req.ip ||
    "local"
  );
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

/* =========================================================
   ✅ Optional auth (supports ?token=JWT)
========================================================= */
function verifyTokenFromQuery(req, _res, next) {
  if (req.user) return next();
  const raw = req.query?.token;
  if (!raw || !JWT_SECRET) return next();
  try {
    req.user = jwt.verify(String(raw), JWT_SECRET);
  } catch {}
  next();
}

const maybeAuth = REQUIRE_AUTH
  ? [verifyTokenFromQuery, authMiddleware]
  : [verifyTokenFromQuery]; // ✅ 不強制登入也能接 query token（方便你後續要記 log）

/* =========================================================
   ✅ Lightweight rate limit (ip + key) with TTL cleanup
========================================================= */
const lastHit = new Map(); // key -> {ts}
const RL_TTL_MS = 10 * 60 * 1000; // 10 min
let rlSweepCounter = 0;

function sweepRateLimit(now = Date.now()) {
  // 每 500 次檢查做一次掃描，避免 Map 無限長大
  rlSweepCounter++;
  if (rlSweepCounter % 500 !== 0) return;

  for (const [k, v] of lastHit.entries()) {
    if (!v || now - (v.ts || 0) > RL_TTL_MS) lastHit.delete(k);
  }
}

function checkRateLimit(ip, key, minIntervalMs = DEFAULT_MIN_INTERVAL_MS) {
  const now = Date.now();
  sweepRateLimit(now);

  const k = `${ip}::${key}`;
  const prev = lastHit.get(k)?.ts || 0;

  if (now - prev < minIntervalMs) {
    return { ok: false, retryAfterMs: minIntervalMs - (now - prev) };
  }

  lastHit.set(k, { ts: now });
  return { ok: true, retryAfterMs: 0 };
}

/* =========================================================
   ✅ Deterministic PRNG + time-mixing (so polling changes)
========================================================= */
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function mixSeed(a, b) {
  // 32-bit mix (simple, stable)
  let x = (a ^ (b + 0x9e3779b9 + ((a << 6) >>> 0) + (a >>> 2))) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

function rndInRange(rand, min, max, decimals = 1) {
  const v = min + (max - min) * rand();
  return +v.toFixed(decimals);
}

/* =========================================================
   ✅ Sample generator
   - 用 tickSec (時間槽) 混 seed：同台機器會隨時間變動，但可重現
========================================================= */
function generateSample({
  machineId,
  seedBase,
  atMs, // 用於歷史或指定時間
  tickSec = 1,

  tempBase = 25,
  tempSpan = 5,
  humBase = 45,
  humSpan = 8,
  progressMax = 100,
  decimals = 1,
  statusBias = 0.85,
  overrideStatus,
  tLow,
  tHigh,
  hLow,
  hHigh,
}) {
  const ts = Number.isFinite(atMs) ? atMs : Date.now();
  const slot = Math.floor((ts / 1000) / Math.max(1, tickSec));
  const seed = mixSeed(seedBase >>> 0, slot >>> 0);
  const rand = mulberry32(seed);

  const temperature = rndInRange(rand, tempBase, tempBase + tempSpan, decimals);
  const humidity = rndInRange(rand, humBase, humBase + humSpan, decimals);

  // runtime/progress：同 slot 內固定，slot 變就變（較像輪詢）
  const runtimeMinutes = Math.floor(rand() * 300);
  const progress = Math.floor(rand() * progressMax);

  const states = ["idle", "running", "maintenance", "error"];
  let status =
    overrideStatus ??
    (rand() < statusBias ? "running" : states[Math.floor(rand() * states.length)]);

  let alarm = false;

  if (
    (typeof tLow === "number" && temperature < tLow) ||
    (typeof tHigh === "number" && temperature > tHigh) ||
    (typeof hLow === "number" && humidity < hLow) ||
    (typeof hHigh === "number" && humidity > hHigh)
  ) {
    alarm = true;
    status = status === "error" ? "error" : "alarm";
  }

  return {
    machineId,
    temperature,
    humidity,
    runtimeMinutes,
    progress,
    status,
    alarm,
    updatedAt: new Date(ts).toISOString(),
  };
}

function generateHistory(baseOpts, history, intervalSec, endAtMs) {
  const out = [];
  const endMs = Number.isFinite(endAtMs) ? endAtMs : Date.now();
  const stepMs = intervalSec * 1000;

  const count = clamp(history, 1, MAX_HISTORY);
  const startMs = endMs - (count - 1) * stepMs;

  for (let i = 0; i < count; i++) {
    const atMs = startMs + i * stepMs;
    out.push(generateSample({ ...baseOpts, atMs }));
  }
  return out;
}

/* =========================================================
   ✅ health (avoid conflict with /:machineId)
========================================================= */
router.get("/health", ...maybeAuth, (req, res) => {
  if (process.env.NODE_ENV === "production" && !ENABLE_SIM_IN_PROD) {
    return res.status(404).json({ ok: false, message: "monitor sim disabled in prod" });
  }
  res.set("Cache-Control", "no-store");
  res.json({
    ok: true,
    requireAuth: REQUIRE_AUTH,
    minIntervalMs: DEFAULT_MIN_INTERVAL_MS,
    maxHistory: MAX_HISTORY,
    maxIntervalSec: MAX_INTERVAL_SEC,
    now: new Date().toISOString(),
  });
});

/* =========================================================
   ✅ Batch query
   GET /api/monitor?ids=1,2,3&seed=123&tick=1
========================================================= */
router.get("/", ...maybeAuth, (req, res) => {
  try {
    if (process.env.NODE_ENV === "production" && !ENABLE_SIM_IN_PROD) {
      return res.status(404).json({ message: "Not Found" });
    }

    res.set("Cache-Control", "no-store");

    const ip = getClientIp(req);
    const ids = clean(req.query.ids)
      .split(",")
      .map((x) => toInt(x, 0))
      .filter((n) => n > 0)
      .slice(0, MAX_IDS);

    if (!ids.length) {
      return res.status(400).json({ message: "請提供 ids=1,2,3" });
    }

    // 限流：批次也限制
    const rl = checkRateLimit(ip, `batch:${ids.join(",")}`);
    if (!rl.ok) {
      res.setHeader("Retry-After", String(Math.ceil(rl.retryAfterMs / 1000)));
      return res.status(429).json({ message: "Too Many Requests", retryAfterMs: rl.retryAfterMs });
    }

    const seedBase = Number.isFinite(Number(req.query.seed))
      ? Number(req.query.seed)
      : 13579;

    const tickSec = clamp(toInt(req.query.tick, 1), 1, MAX_INTERVAL_SEC);

    const decimals = clamp(toInt(req.query.decimals, 1), 0, 3);
    const progressMax = clamp(toInt(req.query.progressMax, 100), 1, 1000);
    const statusBias = clamp(toNum(req.query.statusBias, 0.85), 0, 1);
    const overrideStatus = req.query.overrideStatus ? String(req.query.overrideStatus) : undefined;

    const tLow = toNum(req.query.tLow);
    const tHigh = toNum(req.query.tHigh);
    const hLow = toNum(req.query.hLow);
    const hHigh = toNum(req.query.hHigh);

    const rows = ids.map((idNum) => {
      const opts = {
        machineId: idNum,
        seedBase: mixSeed((seedBase >>> 0) || 1, idNum * 9973),
        tickSec,
        tempBase: Number.isFinite(Number(req.query.tempBase)) ? Number(req.query.tempBase) : 25 + idNum * 1.5,
        tempSpan: Number.isFinite(Number(req.query.tempSpan)) ? Number(req.query.tempSpan) : 5,
        humBase: Number.isFinite(Number(req.query.humBase)) ? Number(req.query.humBase) : 45 + idNum * 2,
        humSpan: Number.isFinite(Number(req.query.humSpan)) ? Number(req.query.humSpan) : 8,
        progressMax,
        decimals,
        statusBias,
        overrideStatus,
        tLow,
        tHigh,
        hLow,
        hHigh,
      };
      return generateSample(opts);
    });

    res.json({ ok: true, rows, count: rows.length, tickSec });
  } catch (err) {
    console.error("❌ monitor batch error:", err);
    res.status(500).json({ message: "monitor batch error" });
  }
});

/* =========================================================
   ⚙️ Single poll
   GET /api/monitor/3?seed=123&history=60&interval=1&tick=1&tHigh=45&hHigh=85
========================================================= */
router.get("/:machineId", ...maybeAuth, async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production" && !ENABLE_SIM_IN_PROD) {
      return res.status(404).json({ message: "Not Found" });
    }

    res.set("Cache-Control", "no-store");

    const { machineId } = req.params;
    const idNum = toInt(machineId, NaN);
    if (!Number.isFinite(idNum)) {
      return res.status(400).json({ message: "無效的 machineId" });
    }

    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, `poll:${idNum}`);
    if (!rl.ok) {
      res.setHeader("Retry-After", String(Math.ceil(rl.retryAfterMs / 1000)));
      return res.status(429).json({ message: "Too Many Requests", retryAfterMs: rl.retryAfterMs });
    }

    // params
    const seedBaseRaw = Number.isFinite(Number(req.query.seed))
      ? Number(req.query.seed)
      : idNum * 9973;

    const history = clamp(toInt(req.query.history ?? "0", 0), 0, MAX_HISTORY);
    const intervalSec = clamp(toInt(req.query.interval ?? "1", 1), 1, MAX_INTERVAL_SEC);
    const tickSec = clamp(toInt(req.query.tick ?? intervalSec, intervalSec), 1, MAX_INTERVAL_SEC);

    const decimals = clamp(toInt(req.query.decimals, 1), 0, 3);
    const progressMax = clamp(toInt(req.query.progressMax, 100), 1, 1000);
    const statusBias = clamp(toNum(req.query.statusBias, 0.85), 0, 1);
    const overrideStatus = req.query.overrideStatus ? String(req.query.overrideStatus) : undefined;

    const tLow = toNum(req.query.tLow);
    const tHigh = toNum(req.query.tHigh);
    const hLow = toNum(req.query.hLow);
    const hHigh = toNum(req.query.hHigh);

    const endAtMs = (() => {
      const raw = req.query.endAt;
      if (raw == null || raw === "") return undefined;
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
      const d = new Date(String(raw));
      return Number.isFinite(d.getTime()) ? d.getTime() : undefined;
    })();

    const opts = {
      machineId: idNum,
      seedBase: (seedBaseRaw >>> 0) || 1,
      tickSec,
      tempBase: Number.isFinite(Number(req.query.tempBase)) ? Number(req.query.tempBase) : 25 + idNum * 1.5,
      tempSpan: Number.isFinite(Number(req.query.tempSpan)) ? Number(req.query.tempSpan) : 5,
      humBase: Number.isFinite(Number(req.query.humBase)) ? Number(req.query.humBase) : 45 + idNum * 2,
      humSpan: Number.isFinite(Number(req.query.humSpan)) ? Number(req.query.humSpan) : 8,
      progressMax,
      decimals,
      statusBias,
      overrideStatus,
      tLow,
      tHigh,
      hLow,
      hHigh,
    };

    if (history > 0) {
      const points = generateHistory(opts, history, intervalSec, endAtMs);
      return res.json({ machineId: idNum, points, count: points.length, intervalSec, tickSec });
    }

    const data = generateSample(opts);

    // （可選）alarm 記 log：只在有登入資訊時
    if (LOG_ALARM && data.alarm && req.user?.id) {
      logAction(req.user.id, "MONITOR_ALARM", "machines", {
        recordId: idNum,
        note: `alarm: T=${data.temperature}, H=${data.humidity}, status=${data.status}`,
        meta: { ...data, ip },
      }).catch(() => {});
    }

    return res.json(data);
  } catch (err) {
    console.error("❌ monitor sample error:", err);
    res.status(500).json({ message: "模擬監控資料錯誤" });
  }
});

/* =========================================================
   🔴 SSE stream
   GET /api/monitor/stream/3?interval=1&seed=123&tick=1
   - 心跳 keep-alive
   - retry 指示
========================================================= */
router.get("/stream/:machineId", ...maybeAuth, (req, res) => {
  try {
    if (process.env.NODE_ENV === "production" && !ENABLE_SIM_IN_PROD) {
      return res.status(404).json({ message: "Not Found" });
    }

    const { machineId } = req.params;
    const idNum = toInt(machineId, NaN);
    if (!Number.isFinite(idNum)) {
      return res.status(400).json({ message: "無效的 machineId" });
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    // 若你有反向代理（nginx），避免 buffering：
    res.setHeader("X-Accel-Buffering", "no");

    res.flushHeaders?.();

    const intervalSec = clamp(toInt(req.query.interval ?? "1", 1), 1, MAX_INTERVAL_SEC);
    const tickSec = clamp(toInt(req.query.tick ?? intervalSec, intervalSec), 1, MAX_INTERVAL_SEC);

    const seedBaseRaw = Number.isFinite(Number(req.query.seed))
      ? Number(req.query.seed)
      : idNum * 123457;

    const decimals = clamp(toInt(req.query.decimals, 1), 0, 3);
    const progressMax = clamp(toInt(req.query.progressMax, 100), 1, 1000);
    const statusBias = clamp(toNum(req.query.statusBias, 0.85), 0, 1);
    const overrideStatus = req.query.overrideStatus ? String(req.query.overrideStatus) : undefined;

    const tLow = toNum(req.query.tLow);
    const tHigh = toNum(req.query.tHigh);
    const hLow = toNum(req.query.hLow);
    const hHigh = toNum(req.query.hHigh);

    const opts = {
      machineId: idNum,
      seedBase: (seedBaseRaw >>> 0) || 1,
      tickSec,
      tempBase: Number.isFinite(Number(req.query.tempBase)) ? Number(req.query.tempBase) : 25 + idNum * 1.5,
      tempSpan: Number.isFinite(Number(req.query.tempSpan)) ? Number(req.query.tempSpan) : 5,
      humBase: Number.isFinite(Number(req.query.humBase)) ? Number(req.query.humBase) : 45 + idNum * 2,
      humSpan: Number.isFinite(Number(req.query.humSpan)) ? Number(req.query.humSpan) : 8,
      progressMax,
      decimals,
      statusBias,
      overrideStatus,
      tLow,
      tHigh,
      hLow,
      hHigh,
    };

    // retry hint (ms)
    res.write(`retry: 3000\n\n`);

    let closed = false;
    let eventId = 0;

    const send = () => {
      if (closed) return;
      const sample = generateSample(opts);

      // event id (optional)
      eventId++;
      res.write(`id: ${eventId}\n`);
      res.write(`event: sample\n`);
      res.write(`data: ${safeJsonStringify(sample)}\n\n`);

      // optional alarm log
      if (LOG_ALARM && sample.alarm && req.user?.id) {
        logAction(req.user.id, "MONITOR_ALARM", "machines", {
          recordId: idNum,
          note: `alarm: T=${sample.temperature}, H=${sample.humidity}, status=${sample.status}`,
          meta: sample,
        }).catch(() => {});
      }
    };

    // first push
    send();

    // push loop
    const timer = setInterval(send, intervalSec * 1000);

    // heartbeat to keep proxies from closing idle connections
    const hb = setInterval(() => {
      if (closed) return;
      res.write(`: ping\n\n`);
    }, 15000);

    req.on("close", () => {
      closed = true;
      clearInterval(timer);
      clearInterval(hb);
    });
  } catch (err) {
    console.error("❌ SSE 串流錯誤:", err);
    try {
      res.end();
    } catch {}
  }
});

export default router;
