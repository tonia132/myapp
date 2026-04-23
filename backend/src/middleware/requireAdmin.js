// backend/src/middleware/requireAdmin.js
export default function requireAdmin(req, res, next) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role === "admin") return next();
  return res.status(403).json({ success: false, message: "只有管理員可以執行此操作" });
}
