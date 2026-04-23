// backend/src/middleware/roleMiddleware.js

// 🔹 統一角色常數，在 routes 裡可以直接 import { ROLE }
export const ROLE = {
  ADMIN: "admin",
  USER: "user",
  SUPERVISOR: "supervisor",
  GUEST: "guest",
};

/**
 * ✅ 角色授權中介層
 *
 * 使用方式：
 *   authorizeRole()                      → 只要登入即可
 *   authorizeRole("admin")               → 只允許 admin
 *   authorizeRole(["admin", "supervisor"])
 *   authorizeRole(ROLE.ADMIN, ROLE.USER) → 建議新寫法
 *
 * @param  {...(string|string[])} roles - 允許的角色
 */
const authorizeRole = (...roles) => {
  let allowedRoles = [];

  // 兼容舊寫法：authorizeRole("admin") 或 authorizeRole(["admin", "supervisor"])
  if (roles.length === 1 && Array.isArray(roles[0])) {
    allowedRoles = roles[0];
  } else {
    allowedRoles = roles;
  }

  // 正規化角色字串（全部轉小寫）
  allowedRoles = allowedRoles
    .filter((r) => r != null)
    .map((r) => String(r).toLowerCase());

  return (req, res, next) => {
    // 未登入
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "尚未登入" });
    }

    const userRole = String(req.user.role || "").toLowerCase();

    // 沒有限制（未傳任何角色）→ 只要有登入就放行
    if (allowedRoles.length === 0) {
      return next();
    }

    // 角色不符
    if (!allowedRoles.includes(userRole)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`🚫 使用者角色 (${userRole}) 無權存取`);
      }
      return res.status(403).json({
        success: false,
        message: "沒有權限執行此操作",
      });
    }

    next();
  };
};

export default authorizeRole;
