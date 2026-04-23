// backend/src/routes/info.js
import express from "express";
import os from "os";
import jwt from "jsonwebtoken";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * 可用環境變數：
 * - INFO_PUBLIC=1               -> 允許未登入訪問（仍會遮罩敏感欄位）
 * - INFO_ADMIN_FULL_ONLY=1      -> 只有 admin 才能拿到 full 欄位（預設 1）
 * - JWT_SECRET                  -> 若你想支援 ?token=JWT（可選）
 */
const INFO_PUBLIC = String(process.env.INFO_PUBLIC ?? "0") === "1";
const INFO_ADMIN_FULL_ONLY = String(process.env.INFO_ADMIN_FULL_ONLY ?? "1") !== "0";

/* ---------------- helpers ---------------- */
const clean = (s) => String(s ?? "").trim();

function toBool(v, def = false) {
  if (v === true || v === false) return v;
  const s = String(v ?? "").toLowerCase().trim();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off", ""].includes(s)) return false;
  return def;
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function isAdmin(req) {
  const r = String(req.user?.role || "").toLowerCase();
  return r === "admin";
}

/**
 * 支援 query token：/api/info?token=JWT
 * - 有 token 就先塞 req.user，後續 authMiddleware 會放行（你的 authMiddleware 若是看 req.user）
 * - 若你的 authMiddleware 一定要 Authorization header，這段至少能讓「INFO_PUBLIC=1」時也拿到 user context
 */
function verifyTokenFromQuery(req, _res, next) {
  if (req.user) return next();
  const raw = req.query?.token;
  if (!raw) return next();
  try {
    const secret = process.env.JWT_SECRET || "";
    if (!secret) return next();
    req.user = jwt.verify(raw, secret);
  } catch {}
  next();
}

/**
 * 解析 proto/host/port（反向代理友好）
 * - 優先 Forwarded: proto=; host=
 * - 其次 X-Forwarded-Proto / X-Forwarded-Host / X-Forwarded-Port
 * - 再來 req.protocol / req.headers.host
 */
function parseForwarded(req) {
  const forwarded = clean(req.headers["forwarded"]);
  // Forwarded: for=..., proto=https; host=example.com:443
  const out = {};
  if (forwarded) {
    const parts = forwarded.split(";").map((x) => x.trim());
    for (const p of parts) {
      const [k, v] = p.split("=");
      if (!k || !v) continue;
      const key = k.trim().toLowerCase();
      const val = v.trim().replace(/^"|"$/g, "");
      if (key === "proto") out.proto = val;
      if (key === "host") out.host = val;
    }
  }
  return out;
}

function getProto(req) {
  const fwd = parseForwarded(req);
  const xf = clean(req.headers["x-forwarded-proto"]);
  const proto = clean(fwd.proto || (xf ? xf.split(",")[0] : "") || req.protocol || "http");
  return proto || "http";
}

function getHost(req) {
  const fwd = parseForwarded(req);
  const xfh = clean(req.headers["x-forwarded-host"]);
  const host = clean(fwd.host || (xfh ? xfh.split(",")[0] : "") || req.headers.host || "");
  const fallback = `localhost:${process.env.PORT || 3000}`;
  return host || fallback;
}

function getPort(req, host) {
  const xfp = clean(req.headers["x-forwarded-port"]);
  if (xfp) {
    const p = Number(String(xfp).split(",")[0].trim());
    if (Number.isFinite(p) && p > 0) return p;
  }

  // host 內帶 port
  const m = String(host || "").match(/:(\d+)$/);
  if (m?.[1]) {
    const p = Number(m[1]);
    if (Number.isFinite(p) && p > 0) return p;
  }

  const envPort = Number(process.env.PORT || 3000);
  return Number.isFinite(envPort) ? envPort : 3000;
}

function buildBaseUrls(req) {
  const proto = getProto(req);
  const host = getHost(req);
  const port = getPort(req, host);

  // publicUrl：用 forwarded host（可能已含 port）
  const publicUrl = `${proto}://${host}`;

  // localUrl：localhost:port
  const localUrl = `${proto}://localhost:${port}`;

  return { proto, host, port, publicUrl, localUrl };
}

/**
 * 列出網卡
 * - includeSensitive=false 時：不回傳 mac/cidr（避免曝露）
 * - family: "IPv4" | "IPv6" | "all"
 */
function listInterfaces({ family = "IPv4", includeInternal = false, includeSensitive = false } = {}) {
  const nets = os.networkInterfaces();
  const out = [];

  for (const ifname of Object.keys(nets)) {
    for (const net of nets[ifname] || []) {
      const fam = String(net.family || "");
      const isFamOk = family === "all" ? true : fam === family;
      if (!isFamOk) continue;
      if (!includeInternal && net.internal) continue;

      const item = {
        ifname,
        family: fam,
        address: net.address,
      };

      if (includeSensitive) {
        item.mac = net.mac;
        item.cidr = net.cidr;
      }

      out.push(item);
    }
  }

  return out;
}

function isValidLanIPv4(ip) {
  if (!ip) return false;
  if (ip === "0.0.0.0") return false;
  if (ip.startsWith("169.254.")) return false; // APIPA
  return true;
}

function bytesSummary() {
  const mem = process.memoryUsage();
  const total = os.totalmem();
  const free = os.freemem();
  return {
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external,
    arrayBuffers: mem.arrayBuffers,
    total,
    free,
    used: total - free,
  };
}

function cpuSummary() {
  const cpus = os.cpus() || [];
  return {
    cores: cpus.length,
    model: cpus[0]?.model || "",
    loadavg: os.loadavg(), // [1,5,15] (Windows 可能是 0)
  };
}

/* ---------------- optional auth gate ---------------- */
function maybeAuth(req, res, next) {
  // INFO_PUBLIC=1 -> 不強制登入
  if (INFO_PUBLIC) return next();
  // 預設：需要登入
  return authMiddleware(req, res, next);
}

/* ============================================================
   ❤️ Health check
   GET /api/info/health
============================================================ */
router.get("/health", verifyTokenFromQuery, (req, res) => {
  res.set("Cache-Control", "no-store");
  res.set("X-Content-Type-Options", "nosniff");
  res.json({
    ok: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
  });
});

/* ============================================================
   🌐 系統資訊 API
   GET /api/info
   query:
     - full=1   （想要更多欄位；預設 admin 才給）
============================================================ */
router.get("/", verifyTokenFromQuery, maybeAuth, (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");

    const { proto, host, port, publicUrl, localUrl } = buildBaseUrls(req);

    const wantFull = toBool(req.query.full, false);

    // ✅ full 欄位是否允許：預設只有 admin
    const admin = isAdmin(req);
    const allowSensitive = admin || (!INFO_ADMIN_FULL_ONLY && !!req.user);
    const includeSensitive = wantFull && allowSensitive;

    // 介面清單（預設 IPv4）
    const lanIPv4 = listInterfaces({
      family: "IPv4",
      includeInternal: false,
      includeSensitive,
    });

    const lanUrls = uniq(
      lanIPv4
        .map((i) => i.address)
        .filter(isValidLanIPv4)
        .map((ip) => `${proto}://${ip}:${port}`)
    );

    // system summary
    const sys = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      node: process.versions.node,
      pid: process.pid,
      uptimeSec: Math.round(process.uptime()),
      cpu: cpuSummary(),
      memory: bytesSummary(),
      env: {
        nodeEnv: process.env.NODE_ENV || "",
        tz: process.env.TZ || "",
      },
    };

    // network summary（保留你原本欄位名稱）
    const net = {
      localUrl,
      publicUrl,
      lanUrls,
      interfaces: lanIPv4,
    };

    // 如果 full=1 且允許，補更多資訊（不破壞原欄位）
    if (includeSensitive) {
      const lanIPv6 = listInterfaces({
        family: "IPv6",
        includeInternal: false,
        includeSensitive: true,
      });

      sys.process = {
        execPath: process.execPath,
        cwd: process.cwd(),
        argv0: process.argv0,
        versions: process.versions,
      };

      net.interfacesV6 = lanIPv6;
      net.raw = {
        proto,
        host,
        port,
        forwarded: {
          forwarded: clean(req.headers["forwarded"]),
          xForwardedProto: clean(req.headers["x-forwarded-proto"]),
          xForwardedHost: clean(req.headers["x-forwarded-host"]),
          xForwardedPort: clean(req.headers["x-forwarded-port"]),
        },
      };
    }

    // ✅ 回傳結構：保留 system/network/timestamp，不破壞既有前端
    res.json({
      ok: true,
      system: sys,
      network: net,
      user: req.user ? { id: req.user.id, username: req.user.username, role: req.user.role } : null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ 無法取得系統資訊:", err);
    res.status(500).json({ ok: false, message: "無法取得系統資訊", error: err?.message || String(err) });
  }
});

export default router;
