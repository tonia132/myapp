// backend/src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { User } from "../models/index.js"; // ✅ 依你專案路徑，通常是這樣

/**
 * ✅ JWT 驗證中介層
 * - 驗證 Header: Authorization: Bearer <token>
 * - 成功後附加 req.user（role 以 DB 為準）
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1️⃣ 確認 Bearer token 格式
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "未授權，請重新登入" });
  }

  const token = authHeader.split(" ")[1];
  if (!token || token === "undefined") {
    return res.status(401).json({ success: false, message: "Token 無效" });
  }

  // 2️⃣ 驗證 JWT Secret
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("❌ 未設定 JWT_SECRET，請檢查 .env");
    return res.status(500).json({ success: false, message: "伺服器設定錯誤 (JWT_SECRET 缺失)" });
  }

  try {
    const decoded = jwt.verify(token, secret);

    // 3️⃣ 結構檢查
    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, message: "登入資訊無效" });
    }

    // ✅ 4️⃣ 從 DB 撈使用者（role 以 DB 為準）
    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "username", "name", "role"],
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "使用者不存在，請重新登入" });
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role || "user",
    };

    next();
  } catch (err) {
    console.error("❌ JWT 驗證失敗:", err.message);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "登入逾時，請重新登入" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Token 無效，請重新登入" });
    }

    return res.status(401).json({ success: false, message: "登入驗證失敗" });
  }
};

export default authMiddleware;
