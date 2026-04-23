// backend/src/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs"; // 跨平台最穩
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { Op } from "sequelize";
import { User } from "../models/index.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRole from "../middleware/roleMiddleware.js"; // 預留（未使用可移除）
import { logAction } from "../utils/logAction.js";

const router = express.Router();

/* ---------------- env/config ---------------- */
const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
const FRONTEND_BASE = process.env.FRONTEND_BASE || "http://localhost:5173";
const AUTO_LOGIN_AFTER_REGISTER =
  String(process.env.AUTO_LOGIN_AFTER_REGISTER ?? "true").toLowerCase() === "true";
const isProd = process.env.NODE_ENV === "production";

// bcrypt cost（預設 10；prod 可拉到 12~14，看你機器）
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10) || 10;

// 安全：避免帳號存在性洩漏（預設開啟）
const HIDE_USER_EXISTENCE =
  String(process.env.AUTH_HIDE_USER_EXISTENCE ?? "true").toLowerCase() === "true";

// Rate limit（記憶體版）
const RL_WINDOW_MS = 60_000;
const RL_MAX_LOGIN_PER_WINDOW = 30; // 每 IP/帳號 每分鐘登入嘗試
const RL_MAX_CHECK_PER_WINDOW = 60; // check-username/check-email
const RL_MAX_FORGOT_PER_WINDOW = 10; // forgot
const RL_MAX_RESET_PER_WINDOW = 20; // reset

// 登入失敗鎖定
const LOGIN_FAIL_LIMIT = Number(process.env.LOGIN_FAIL_LIMIT || 8) || 8;
const LOGIN_LOCK_MS = Number(process.env.LOGIN_LOCK_MS || 10 * 60 * 1000) || 10 * 60 * 1000;

// 密碼長度（bcrypt 有 72 bytes 限制，超過會被截斷造成風險）
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

// username 規則
const USERNAME_MIN = 3;
const USERNAME_MAX = 32;
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/i;

// email 粗略驗證
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const norm = (s) => String(s ?? "").trim();
const lower = (s) => norm(s).toLowerCase();

function hasAttr(model, key) {
  return !!model?.rawAttributes?.[key];
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

function pickExisting(model, src) {
  const out = {};
  if (!model?.rawAttributes) return out;
  for (const k of Object.keys(src || {})) {
    if (hasAttr(model, k) && src[k] !== undefined) out[k] = src[k];
  }
  return out;
}

function safeUrlBase(base) {
  // 避免 FRONTEND_BASE 有奇怪的結尾斜線
  const s = String(base || "").trim().replace(/\/+$/, "");
  return s || "http://localhost:5173";
}

/* ---------------- token ---------------- */
function signToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };

  // 可選：tokenVersion（你之後若在 authMiddleware 驗 tv，可做 logout/改密碼立即失效）
  if (hasAttr(User, "tokenVersion")) payload.tv = Number(user.tokenVersion || 0) || 0;

  // 可選：jti（方便日後做 token blacklist）
  payload.jti = crypto.randomBytes(12).toString("hex");

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/* ---------------- unified error ---------------- */
function replyError(err, res, fallback = "伺服器錯誤") {
  if (err?.name === "SequelizeUniqueConstraintError" || err?.original?.code === "ER_DUP_ENTRY") {
    const field = err?.errors?.[0]?.path || "欄位";
    return res.status(409).json({ success: false, message: `${field} 已存在` });
  }
  if (err?.name === "SequelizeValidationError") {
    return res.status(400).json({
      success: false,
      message: err?.errors?.[0]?.message || "欄位驗證失敗",
    });
  }

  console.error("❌ 路由錯誤:", {
    name: err?.name,
    message: err?.message,
    sql: err?.original?.sql,
    sqlMessage: err?.original?.sqlMessage,
    stack: err?.stack,
  });

  const devMsg = err?.original?.sqlMessage || err?.message || fallback;
  return res.status(500).json({ success: false, message: isProd ? fallback : devMsg });
}

/* ---------------- rate limit (memory) ---------------- */
const rlMap = new Map(); // key -> { ts, count }

function hitRate(key, max) {
  const t = Date.now();
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
  return rec.count <= max;
}

/* ---------------- lockout (memory) ---------------- */
const lockMap = new Map(); // username -> { fails, lockUntil }

function isLocked(username) {
  const rec = lockMap.get(username);
  if (!rec) return false;
  if (rec.lockUntil && Date.now() < rec.lockUntil) return true;
  return false;
}

function noteFail(username) {
  const rec = lockMap.get(username) || { fails: 0, lockUntil: 0 };
  rec.fails += 1;
  if (rec.fails >= LOGIN_FAIL_LIMIT) {
    rec.lockUntil = Date.now() + LOGIN_LOCK_MS;
    rec.fails = 0; // 進入鎖定後重置 fail counter
  }
  lockMap.set(username, rec);
}

function noteSuccess(username) {
  lockMap.delete(username);
}

/* ---------------- validators ---------------- */
function validateUsername(username) {
  const u = lower(username);
  if (!u) return { ok: false, message: "帳號必填" };
  if (u.length < USERNAME_MIN || u.length > USERNAME_MAX)
    return { ok: false, message: `帳號長度需 ${USERNAME_MIN}~${USERNAME_MAX} 字` };
  if (!USERNAME_RE.test(u)) return { ok: false, message: "帳號格式不正確（僅允許英數、._-，且需英數開頭）" };
  return { ok: true, value: u };
}

function validateEmail(email) {
  const e = lower(email);
  if (!e) return { ok: false, message: "Email 必填" };
  if (e.length > 254) return { ok: false, message: "Email 過長" };
  if (!EMAIL_RE.test(e)) return { ok: false, message: "Email 格式不正確" };
  return { ok: true, value: e };
}

function validatePassword(pw, label = "密碼") {
  const s = String(pw ?? "");
  if (!s) return { ok: false, message: `${label} 必填` };
  if (s.length < PASSWORD_MIN) return { ok: false, message: `${label}至少 ${PASSWORD_MIN} 碼` };
  if (s.length > PASSWORD_MAX)
    return { ok: false, message: `${label}不可超過 ${PASSWORD_MAX} 碼（bcrypt 限制）` };
  return { ok: true, value: s };
}

/* ============ Public: 查重（登入/註冊頁輸入時使用） ============ */
router.get("/check-username", async (req, res) => {
  try {
    const ip = getClientIp(req);
    if (!hitRate(`checkU:${ip}`, RL_MAX_CHECK_PER_WINDOW)) {
      return res.status(429).json({ success: false, message: "請求過於頻繁" });
    }

    const v = validateUsername(req.query.username || "");
    if (!v.ok) return res.json({ success: true, taken: false }); // UI 友善：無效輸入視為未佔用

    const hit = await User.findOne({ where: { username: v.value } });
    res.json({ success: true, taken: !!hit });
  } catch (err) {
    return replyError(err, res);
  }
});

router.get("/check-email", async (req, res) => {
  try {
    const ip = getClientIp(req);
    if (!hitRate(`checkE:${ip}`, RL_MAX_CHECK_PER_WINDOW)) {
      return res.status(429).json({ success: false, message: "請求過於頻繁" });
    }

    const v = validateEmail(req.query.email || "");
    if (!v.ok) return res.json({ success: true, taken: false });

    const hit = await User.findOne({ where: { email: v.value } });
    res.json({ success: true, taken: !!hit });
  } catch (err) {
    return replyError(err, res);
  }
});

/* ============ Login ============ */
router.post("/login", async (req, res) => {
  try {
    if (!JWT_SECRET) return res.status(500).json({ success: false, message: "伺服器未設定 JWT_SECRET" });

    const ip = getClientIp(req);
    const ua = String(req.headers["user-agent"] || "");
    const { username, password } = req.body || {};

    const vu = validateUsername(username);
    const vp = validatePassword(password);

    // rate limit：以 ip + username 綜合
    const rlKey = `login:${ip}:${lower(username || "")}`;
    if (!hitRate(rlKey, RL_MAX_LOGIN_PER_WINDOW)) {
      return res.status(429).json({ success: false, message: "嘗試次數過多，請稍後再試" });
    }

    if (!vu.ok || !vp.ok) {
      // 不洩漏太多細節
      return res.status(400).json({ success: false, message: "請輸入正確的帳號與密碼" });
    }

    // 記憶體鎖定（username）
    if (isLocked(vu.value)) {
      return res.status(429).json({ success: false, message: "登入失敗次數過多，已暫時鎖定，請稍後再試" });
    }

    const user = await User.unscoped().findOne({ where: { username: vu.value } });

    if (!user) {
      // 審計（不阻塞）
      logAction(null, "LOGIN_FAIL", "users", { username: vu.value, ip, ua, reason: "NO_USER" }).catch(() => {});
      // 記憶體 fail 累積
      noteFail(vu.value);

      return res.status(400).json({
        success: false,
        message: HIDE_USER_EXISTENCE ? "帳號或密碼錯誤" : "帳號不存在",
      });
    }

    if (user.isActive === false) {
      logAction(user.id, "LOGIN_FAIL", "users", { ip, ua, reason: "INACTIVE" }).catch(() => {});
      return res.status(403).json({ success: false, message: "帳號已停用" });
    }

    // DB 鎖定（可選欄位）
    if (hasAttr(User, "loginLockUntil") && user.loginLockUntil) {
      const lockUntil = new Date(user.loginLockUntil).getTime();
      if (Number.isFinite(lockUntil) && Date.now() < lockUntil) {
        logAction(user.id, "LOGIN_FAIL", "users", { ip, ua, reason: "LOCKED_DB" }).catch(() => {});
        return res.status(429).json({ success: false, message: "登入失敗次數過多，已暫時鎖定，請稍後再試" });
      }
    }

    const looksHashed =
      typeof user.password === "string" && user.password.startsWith("$2") && user.password.length > 20;
    if (!looksHashed) {
      logAction(user.id, "LOGIN_FAIL", "users", { ip, ua, reason: "PW_INVALID" }).catch(() => {});
      return res.status(400).json({
        success: false,
        message: "此帳號密碼尚未設定或已失效，請使用「忘記密碼」重設。",
      });
    }

    const ok = await bcrypt.compare(vp.value, user.password);

    if (!ok) {
      // 記憶體 fail 累積
      noteFail(vu.value);

      // DB fail 累積（可選）
      if (hasAttr(User, "loginFailCount") || hasAttr(User, "loginLockUntil")) {
        const nextFail = (Number(user.loginFailCount || 0) || 0) + 1;
        const updates = { loginFailCount: nextFail };

        if (nextFail >= LOGIN_FAIL_LIMIT && hasAttr(User, "loginLockUntil")) {
          updates.loginLockUntil = new Date(Date.now() + LOGIN_LOCK_MS);
          updates.loginFailCount = 0;
        }
        await user.update(pickExisting(User, updates)).catch(() => {});
      }

      logAction(user.id, "LOGIN_FAIL", "users", { ip, ua, reason: "BAD_PASSWORD" }).catch(() => {});
      return res.status(400).json({ success: false, message: "帳號或密碼錯誤" });
    }

    // 成功：清掉鎖定/失敗次數（記憶體 + DB）
    noteSuccess(vu.value);
    if (hasAttr(User, "loginFailCount") || hasAttr(User, "loginLockUntil")) {
      await user.update(pickExisting(User, { loginFailCount: 0, loginLockUntil: null })).catch(() => {});
    }

    // 可選：紀錄最後登入
    if (hasAttr(User, "lastLoginAt") || hasAttr(User, "lastLoginIp")) {
      await user.update(pickExisting(User, { lastLoginAt: new Date(), lastLoginIp: ip })).catch(() => {});
    }

    const token = signToken(user);

    logAction(user.id, "LOGIN", "users", { ip, ua, url: req.originalUrl }).catch(() => {});

    res.json({
      success: true,
      message: "登入成功",
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email },
    });
  } catch (err) {
    return replyError(err, res);
  }
});

/* ============ Register ============ */
router.post("/register", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const ua = String(req.headers["user-agent"] || "");

    const { username, password, name, email } = req.body || {};

    const vu = validateUsername(username);
    const vp = validatePassword(password);
    const vn = norm(name);
    const ve = validateEmail(email);

    if (!vu.ok || !vp.ok || !vn || !ve.ok) {
      return res.status(400).json({
        success: false,
        message: !vu.ok
          ? vu.message
          : !vp.ok
          ? vp.message
          : !vn
          ? "名稱必填"
          : ve.message,
      });
    }

    if (vn.length > 80) {
      return res.status(400).json({ success: false, message: "名稱過長" });
    }

    // 先查重（避免 DB 丟錯）
    if (await User.findOne({ where: { username: vu.value } }))
      return res.status(409).json({ success: false, message: "帳號已存在" });
    if (await User.findOne({ where: { email: ve.value } }))
      return res.status(409).json({ success: false, message: "Email 已被使用" });

    const hash = await bcrypt.hash(vp.value, BCRYPT_ROUNDS);

    const now = new Date();
    const created = await User.create({
      username: vu.value,
      password: hash,
      name: vn,
      email: ve.value,
      role: "user",
      isActive: true,
      createdAt: now,
      updatedAt: now,
      // 可選欄位：初始化
      ...(hasAttr(User, "tokenVersion") ? { tokenVersion: 0 } : {}),
      ...(hasAttr(User, "loginFailCount") ? { loginFailCount: 0 } : {}),
      ...(hasAttr(User, "loginLockUntil") ? { loginLockUntil: null } : {}),
    });

    logAction(created.id, "REGISTER", "users", { ip, ua }).catch(() => {});

    let token;
    if (AUTO_LOGIN_AFTER_REGISTER && JWT_SECRET) token = signToken(created);

    return res.status(201).json({
      success: true,
      message: token ? "註冊成功，已自動登入" : "註冊成功，請登入",
      token,
      user: {
        id: created.id,
        username: created.username,
        name: created.name,
        role: created.role,
        email: created.email,
      },
    });
  } catch (err) {
    return replyError(err, res, "註冊失敗");
  }
});

/* ============ Me / Refresh / Logout ============ */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "使用者不存在" });
    res.json({
      success: true,
      user: { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email },
    });
  } catch (err) {
    return replyError(err, res);
  }
});

router.post("/refresh", authMiddleware, async (req, res) => {
  try {
    if (!JWT_SECRET) return res.status(500).json({ success: false, message: "伺服器未設定 JWT_SECRET" });
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "使用者不存在" });
    if (user.isActive === false) return res.status(403).json({ success: false, message: "帳號已停用" });

    const token = signToken(user);
    res.json({ success: true, token });
  } catch (err) {
    return replyError(err, res);
  }
});

// 無狀態登出（前端清掉 token 即可；這裡做審計；若你之後做 tokenVersion 機制也可順便 +1）
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    const ip = getClientIp(req);
    const ua = String(req.headers["user-agent"] || "");

    // 可選：若 users 有 tokenVersion，登出時 +1（搭配你未來在 authMiddleware 檢查 tv）
    if (hasAttr(User, "tokenVersion")) {
      const u = await User.findByPk(req.user.id).catch(() => null);
      if (u) await u.update({ tokenVersion: (Number(u.tokenVersion || 0) || 0) + 1 }).catch(() => {});
    }

    logAction(req.user.id, "LOGOUT", "users", { ip, ua }).catch(() => {});
    res.json({ success: true, message: "已登出" });
  } catch (err) {
    return replyError(err, res);
  }
});

/* ============ Change Password (需登入) ============ */
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const ip = getClientIp(req);
    const ua = String(req.headers["user-agent"] || "");
    const { oldPassword, newPassword } = req.body || {};

    const vo = validatePassword(oldPassword, "舊密碼");
    const vn = validatePassword(newPassword, "新密碼");
    if (!vo.ok || !vn.ok) {
      return res.status(400).json({ success: false, message: !vo.ok ? vo.message : vn.message });
    }

    const user = await User.unscoped().findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "使用者不存在" });

    const ok = await bcrypt.compare(vo.value, user.password);
    if (!ok) return res.status(400).json({ success: false, message: "舊密碼不正確" });

    const updates = {
      password: await bcrypt.hash(vn.value, BCRYPT_ROUNDS),
      resetTokenHash: null,
      resetTokenExpires: null,
    };

    // 可選：改密碼時 tokenVersion +1（搭配未來 middleware 檢查）
    if (hasAttr(User, "tokenVersion")) {
      updates.tokenVersion = (Number(user.tokenVersion || 0) || 0) + 1;
    }

    await user.update(pickExisting(User, updates));

    logAction(user.id, "CHANGE_PASSWORD", "users", { ip, ua }).catch(() => {});
    res.json({ success: true, message: "密碼已更新" });
  } catch (err) {
    return replyError(err, res);
  }
});

/* ============ Forgot / Reset ============ */
// 需要 users 表具備 resetTokenHash(CHAR(64)), resetTokenExpires(DATETIME)
router.post("/forgot", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const ua = String(req.headers["user-agent"] || "");

    if (!hitRate(`forgot:${ip}`, RL_MAX_FORGOT_PER_WINDOW)) {
      return res.status(429).json({ success: false, message: "請求過於頻繁" });
    }

    const ve = validateEmail(req.body?.email || "");
    if (!ve.ok) return res.status(400).json({ success: false, message: ve.message });

    // 若欄位不存在，直接回應（避免誤用）
    if (!hasAttr(User, "resetTokenHash") || !hasAttr(User, "resetTokenExpires")) {
      return res.status(500).json({ success: false, message: "系統未配置重設密碼欄位" });
    }

    const user = await User.unscoped().findOne({ where: { email: ve.value } });

    // 不管有沒有 user，都回同樣訊息（避免枚舉）
    let resetUrl = null;

    if (user) {
      const raw = crypto.randomBytes(32).toString("hex"); // 給使用者的 token
      const hash = crypto.createHash("sha256").update(raw).digest("hex"); // 存 DB 的雜湊
      const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 分鐘

      await user.update({
        resetTokenHash: hash,
        resetTokenExpires: expires,
      });

      logAction(user.id, "FORGOT_PASSWORD", "users", { ip, ua }).catch(() => {});

      // 正式環境不回傳 resetUrl（避免 token 泄漏）；應改寄 Email
      if (!isProd) {
        const base = safeUrlBase(FRONTEND_BASE);
        resetUrl = `${base}/reset-password?token=${raw}`;
      }
    }

    res.json({ success: true, message: "若 Email 存在，已寄出重設連結", resetUrl });
  } catch (err) {
    return replyError(err, res);
  }
});

router.post("/reset", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const ua = String(req.headers["user-agent"] || "");

    if (!hitRate(`reset:${ip}`, RL_MAX_RESET_PER_WINDOW)) {
      return res.status(429).json({ success: false, message: "請求過於頻繁" });
    }

    const { token, password } = req.body || {};

    const vp = validatePassword(password);
    if (!token || !vp.ok) {
      return res.status(400).json({ success: false, message: !token ? "參數不足" : vp.message });
    }

    if (!hasAttr(User, "resetTokenHash") || !hasAttr(User, "resetTokenExpires")) {
      return res.status(500).json({ success: false, message: "系統未配置重設密碼欄位" });
    }

    const hash = crypto.createHash("sha256").update(String(token)).digest("hex");

    const user = await User.unscoped().findOne({
      where: {
        resetTokenHash: hash,
        resetTokenExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) return res.status(400).json({ success: false, message: "重設連結無效或已過期" });

    const updates = {
      password: await bcrypt.hash(vp.value, BCRYPT_ROUNDS),
      resetTokenHash: null,
      resetTokenExpires: null,
    };

    // 可選：重設密碼也 tokenVersion +1
    if (hasAttr(User, "tokenVersion")) {
      updates.tokenVersion = (Number(user.tokenVersion || 0) || 0) + 1;
    }

    await user.update(pickExisting(User, updates));

    logAction(user.id, "RESET_PASSWORD", "users", { ip, ua }).catch(() => {});
    res.json({ success: true, message: "密碼已更新，請重新登入" });
  } catch (err) {
    return replyError(err, res);
  }
});

export default router;
