// backend/src/routes/users.js
import express from "express";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { User, TestSupport, sequelize } from "../models/index.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRole, { ROLE } from "../middleware/roleMiddleware.js";
import { logAction } from "../utils/logAction.js";

const router = express.Router();
const isProd = process.env.NODE_ENV === "production";

/* ---------------------------- 小工具 ---------------------------- */
const clean = (s) => String(s ?? "").trim();
const lower = (s) => clean(s).toLowerCase();

const SAFE_USER_ATTRS = [
  "id",
  "username",
  "name",
  "email",
  "role",
  "isActive",
  "includeInStats",
  "workCapacity",
  "createdAt",
  "updatedAt",
];

// ✅ 把 user 物件的 password 移除（避免回傳/寫 log）
function stripPassword(obj) {
  if (!obj) return obj;
  const j = obj?.toJSON ? obj.toJSON() : obj;
  if (!j || typeof j !== "object") return j;
  const out = { ...j };
  delete out.password;
  return out;
}

function replyError(err, res, fallback = "伺服器錯誤") {
  if (
    err?.name === "SequelizeUniqueConstraintError" ||
    err?.original?.code === "ER_DUP_ENTRY"
  ) {
    const field = err?.errors?.[0]?.path || "欄位";
    return res.status(409).json({ success: false, message: `${field} 已存在` });
  }
  if (err?.name === "SequelizeValidationError") {
    return res.status(400).json({
      success: false,
      message: err?.errors?.[0]?.message || "欄位驗證失敗",
    });
  }

  console.error("❌ users 路由錯誤:", {
    name: err?.name,
    message: err?.message,
    sql: err?.original?.sql,
    sqlMessage: err?.original?.sqlMessage,
    stack: err?.stack,
  });

  return res.status(500).json({
    success: false,
    message: isProd ? fallback : err?.message || fallback,
  });
}

// ✅ 角色合法性檢查
function assertRole(role) {
  if (!role) return false;
  const v = String(role).toLowerCase();
  return Object.values(ROLE).includes(v);
}

/* -------------------------- 全路由保護 -------------------------- */
router.use(authMiddleware);

/* ============================================================
   👤 取得自己的資料
   GET /api/users/me
   ✅ 不回傳 password
============================================================ */
router.get("/me", async (req, res) => {
  try {
    const me = await User.findByPk(req.user.id, { attributes: SAFE_USER_ATTRS });
    if (!me) return res.status(404).json({ success: false, message: "使用者不存在" });
    return res.json({ success: true, data: me });
  } catch (err) {
    replyError(err, res);
  }
});

/* ============================================================
   ✏️ 更新自己的基本資料（name / email）
   PUT /api/users/me
============================================================ */
router.put("/me", async (req, res) => {
  try {
    const { name, email } = req.body || {};
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "使用者不存在" });
    }

    // ✅ email 如果有送，就不能是空字串
    if (email !== undefined) {
      const newEmail = lower(email);
      if (!newEmail) {
        return res.status(400).json({ success: false, message: "Email 不可為空" });
      }
      if (newEmail !== user.email) {
        const exist = await User.findOne({ where: { email: newEmail } });
        if (exist) {
          return res.status(409).json({ success: false, message: "Email 已被使用" });
        }
      }
    }

    const before = stripPassword(user);

    await user.update({
      name: name !== undefined ? clean(name) : user.name,
      email: email !== undefined ? lower(email) : user.email,
    });

    await logAction(req.user.id, "UPDATE_PROFILE", "users", {
      recordId: user.id,
      before,
      after: stripPassword(user),
    }).catch(() => {});

    // ✅ 回傳安全欄位
    const safe = await User.findByPk(req.user.id, { attributes: SAFE_USER_ATTRS });
    return res.json({ success: true, message: "個人資料已更新", data: safe });
  } catch (err) {
    replyError(err, res);
  }
});

/* ============================================================
   👥 精簡使用者清單（給下拉指派用）
   GET /api/users/simple
   - 任何已登入者可呼叫
   - 排除 guest
============================================================ */
router.get("/simple", async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "username", "name", "role", "isActive"],
      where: {
        isActive: true,
        role: { [Op.ne]: ROLE.GUEST },
      },
      order: [
        ["name", "ASC"],
        ["username", "ASC"],
      ],
    });

    return res.json(users); // ✅ 回純陣列
  } catch (err) {
    replyError(err, res, "取得使用者清單失敗");
  }
});

/* ============================================================
   📋 使用者清單（搜尋 + 分頁）— 管理員
   GET /api/users?keyword=&page=1&pageSize=20
============================================================ */
router.get("/", authorizeRole(ROLE.ADMIN), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.max(
      1,
      Math.min(200, parseInt(req.query.pageSize || "20", 10))
    );
    const keyword = clean(req.query.keyword || "");

    const where = {};
    if (keyword) {
      where[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { name: { [Op.like]: `%${keyword}%` } },
        { email: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: [
        "id",
        "username",
        "name",
        "email",
        "role",
        "isActive",
        "includeInStats",
        "workCapacity",
        "createdAt",
        "updatedAt",
      ],
      order: [["id", "ASC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return res.json({ success: true, data: rows, total: count, page, pageSize });
  } catch (err) {
    replyError(err, res);
  }
});

/* ============================================================
   🆕 新增使用者 — 管理員
   POST /api/users
   ✅ 回傳不含 password
============================================================ */
router.post("/", authorizeRole(ROLE.ADMIN), async (req, res) => {
  try {
    const { username, name, email, password, role, workCapacity } = req.body || {};
    if (!username || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "請輸入完整資訊（帳號/姓名/Email/密碼）",
      });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ success: false, message: "密碼至少 8 碼" });
    }

    const normalizedRole = role ? String(role).toLowerCase() : null;
    if (normalizedRole && !assertRole(normalizedRole)) {
      return res.status(400).json({ success: false, message: "角色不合法" });
    }

    const u = lower(username);
    const e = lower(email);
    if (!u) return res.status(400).json({ success: false, message: "username 不可為空" });
    if (!e) return res.status(400).json({ success: false, message: "Email 不可為空" });

    if (await User.findOne({ where: { username: u } })) {
      return res.status(409).json({ success: false, message: "帳號已存在" });
    }
    if (await User.findOne({ where: { email: e } })) {
      return res.status(409).json({ success: false, message: "Email 已被使用" });
    }

    // workCapacity（預設 3）
    const capacity =
      workCapacity === undefined || workCapacity === null || workCapacity === ""
        ? 3
        : Number(workCapacity);

    if (!Number.isFinite(capacity) || capacity <= 0) {
      return res.status(400).json({ success: false, message: "workCapacity 需為大於 0 的數字" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const finalRole = normalizedRole || ROLE.GUEST;

    const created = await User.create({
      username: u,
      password: hashed,
      name: clean(name),
      email: e,
      role: finalRole,
      isActive: true,
      includeInStats: finalRole === ROLE.GUEST ? false : true,
      workCapacity: capacity,
    });

    await logAction(req.user.id, "CREATE_USER", "users", {
      recordId: created.id,
      after: stripPassword(created),
    }).catch(() => {});

    const safeUser = await User.findByPk(created.id, { attributes: SAFE_USER_ATTRS });

    return res.status(201).json({
      success: true,
      message: "✅ 使用者建立成功",
      data: safeUser,
    });
  } catch (err) {
    replyError(err, res);
  }
});

/* ============================================================
   ✨ 一次更新他人基本資料 — 管理員
   PUT /api/users/:id
============================================================ */
router.put("/:id", authorizeRole(ROLE.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive, includeInStats, workCapacity } = req.body || {};

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: "使用者不存在" });

    const updates = {};

    if (name !== undefined) updates.name = clean(name);

    if (email !== undefined) {
      const newEmail = lower(email);
      if (!newEmail) return res.status(400).json({ success: false, message: "Email 不可為空" });

      if (newEmail !== user.email) {
        const exists = await User.findOne({
          where: { email: newEmail, id: { [Op.ne]: user.id } },
        });
        if (exists) {
          return res.status(409).json({ success: false, message: "Email 已被使用" });
        }
      }
      updates.email = newEmail;
    }

    if (role !== undefined) {
      const normalizedRole = String(role).toLowerCase();
      if (!assertRole(normalizedRole)) {
        return res.status(400).json({ success: false, message: "角色不合法" });
      }
      updates.role = normalizedRole;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ success: false, message: "isActive 需為布林值" });
      }
      updates.isActive = isActive;
    }

    if (includeInStats !== undefined) {
      if (typeof includeInStats !== "boolean") {
        return res.status(400).json({ success: false, message: "includeInStats 需為布林值" });
      }
      updates.includeInStats = includeInStats;
    }

    if (workCapacity !== undefined) {
      const capacity = Number(workCapacity);
      if (!Number.isFinite(capacity) || capacity <= 0) {
        return res.status(400).json({ success: false, message: "workCapacity 需為大於 0 的數字" });
      }
      updates.workCapacity = capacity;
    }

    const before = stripPassword(user);
    await user.update(updates);

    await logAction(req.user.id, "UPDATE_USER", "users", {
      recordId: user.id,
      before,
      after: stripPassword(user),
    }).catch(() => {});

    const safe = await User.findByPk(user.id, { attributes: SAFE_USER_ATTRS });
    return res.json({ success: true, message: "已更新使用者", data: safe });
  } catch (err) {
    replyError(err, res);
  }
});

/* ============================================================
   🔐 管理員一鍵重設他人密碼為 00000000
   POST  /api/users/:id/reset-password
   PATCH /api/users/:id/reset-password
   (alias) /api/users/:id/resetPassword
============================================================ */
async function resetPasswordToZeros(req, res) {
  try {
    const newPassword = "00000000"; // ✅ 8 個 0

    // ✅ 需要 password 欄位時才 unscoped
    const user = await User.unscoped().findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "使用者不存在" });

    const before = stripPassword(user);

    await user.update({ password: await bcrypt.hash(newPassword, 10) });

    await logAction(req.user.id, "ADMIN_RESET_PASSWORD_00000000", "users", {
      recordId: user.id,
      before,
    }).catch(() => {});

    return res.json({ success: true, message: "密碼已重設為 00000000" });
  } catch (err) {
    replyError(err, res);
  }
}

router.post("/:id/reset-password", authorizeRole(ROLE.ADMIN), resetPasswordToZeros);
router.patch("/:id/reset-password", authorizeRole(ROLE.ADMIN), resetPasswordToZeros);

// ✅ alias：避免前端用 camelCase
router.post("/:id/resetPassword", authorizeRole(ROLE.ADMIN), resetPasswordToZeros);
router.patch("/:id/resetPassword", authorizeRole(ROLE.ADMIN), resetPasswordToZeros);

/* ============================================================
   🔐 管理員重設他人密碼（自訂新密碼）
   PATCH /api/users/:id/password
   body: { newPassword }
============================================================ */
router.patch("/:id/password", authorizeRole(ROLE.ADMIN), async (req, res) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ success: false, message: "新密碼至少 8 碼" });
    }

    // ✅ 需要 password 欄位時才 unscoped
    const user = await User.unscoped().findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "使用者不存在" });

    // ✅ log 不要存 password hash
    const before = stripPassword(user);

    await user.update({ password: await bcrypt.hash(newPassword, 10) });

    await logAction(req.user.id, "ADMIN_RESET_PASSWORD", "users", {
      recordId: user.id,
      before,
    }).catch(() => {});

    return res.json({ success: true, message: "密碼已重設" });
  } catch (err) {
    replyError(err, res);
  }
});

/* ============================================================
   🛡️ 設定使用者角色 — 管理員
   PATCH /api/users/:id/role
============================================================ */
router.patch("/:id/role", authorizeRole(ROLE.ADMIN), async (req, res) => {
  try {
    const { role } = req.body || {};
    const normalizedRole = String(role || "").toLowerCase();

    if (!assertRole(normalizedRole)) {
      return res.status(400).json({ success: false, message: "角色不合法" });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "使用者不存在" });

    const before = stripPassword(user);
    await user.update({ role: normalizedRole });

    await logAction(req.user.id, "UPDATE_USER_ROLE", "users", {
      recordId: user.id,
      before,
      after: stripPassword(user),
    }).catch(() => {});

    const safe = await User.findByPk(user.id, { attributes: SAFE_USER_ATTRS });
    return res.json({ success: true, message: "角色已更新", data: safe });
  } catch (err) {
    replyError(err, res);
  }
});

/* ============================================================
   🛡️ 依 username 設定角色 — 管理員
   PATCH /api/users/role-by-username
============================================================ */
router.patch("/role-by-username", authorizeRole(ROLE.ADMIN), async (req, res) => {
  try {
    const { username, role } = req.body || {};
    const normalizedRole = String(role || "").toLowerCase();

    if (!username || !assertRole(normalizedRole)) {
      return res.status(400).json({ success: false, message: "請提供有效 username 與 role" });
    }

    const user = await User.findOne({ where: { username: lower(username) } });
    if (!user) return res.status(404).json({ success: false, message: "使用者不存在" });

    const before = stripPassword(user);
    await user.update({ role: normalizedRole });

    await logAction(req.user.id, "UPDATE_USER_ROLE", "users", {
      recordId: user.id,
      before,
      after: stripPassword(user),
    }).catch(() => {});

    const safe = await User.findByPk(user.id, { attributes: SAFE_USER_ATTRS });

    return res.json({
      success: true,
      message: `已將 ${user.username} 設為 ${normalizedRole}`,
      data: safe,
    });
  } catch (err) {
    replyError(err, res);
  }
});

/* ============================================================
   🚫 啟用 / 停用帳號 — 管理員
   PATCH /api/users/:id/status
============================================================ */
router.patch("/:id/status", authorizeRole(ROLE.ADMIN), async (req, res) => {
  try {
    const { isActive } = req.body || {};
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive 需為布林值" });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "使用者不存在" });

    const before = stripPassword(user);
    await user.update({ isActive });

    await logAction(req.user.id, "UPDATE_USER_STATUS", "users", {
      recordId: user.id,
      before,
      after: stripPassword(user),
    }).catch(() => {});

    const safe = await User.findByPk(user.id, { attributes: SAFE_USER_ATTRS });

    return res.json({
      success: true,
      message: `帳號已${isActive ? "啟用" : "停用"}`,
      data: safe,
    });
  } catch (err) {
    replyError(err, res);
  }
});

/* ============================================================
   🗑️ 刪除使用者（hard delete）— 管理員
   DELETE /api/users/:id
   ✅ 用 transaction
   ⚠️ 若其它表有 FK RESTRICT，仍可能刪不掉（建議改成停用/soft delete）
============================================================ */
router.delete("/:id", authorizeRole(ROLE.ADMIN), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "無效的使用者 ID" });
    }

    if (id === req.user.id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "不能刪除自己帳號" });
    }

    const user = await User.findByPk(id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "使用者不存在" });
    }

    // 避免刪掉最後一個 admin
    if (String(user.role || "").toLowerCase() === ROLE.ADMIN) {
      const adminCount = await User.count({ where: { role: ROLE.ADMIN }, transaction: t });
      if (adminCount <= 1) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "系統至少需保留一位管理員，無法刪除最後一位 admin",
        });
      }
    }

    const before = stripPassword(user);

    // 1) 先刪掉 TestSupport（你目前只清這個）
    await TestSupport.destroy({ where: { supporterId: id }, transaction: t });

    // 2) 刪 user
    await user.destroy({ transaction: t });

    await t.commit();

    await logAction(req.user.id, "DELETE_USER_HARD", "users", {
      recordId: id,
      before,
    }).catch(() => {});

    return res.json({ success: true, message: "使用者已從資料庫刪除" });
  } catch (err) {
    await t.rollback();
    replyError(err, res, "刪除使用者失敗（可能有外鍵關聯未清除）");
  }
});

export default router;
