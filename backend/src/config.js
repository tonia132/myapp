// backend/src/config.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 讀取 .env（優先 backend/.env，其次專案根）
const backendEnv = path.resolve(__dirname, "../.env");
const projectEnv = path.resolve(__dirname, "../../.env");
if (fs.existsSync(backendEnv)) dotenv.config({ path: backendEnv });
else if (fs.existsSync(projectEnv)) dotenv.config({ path: projectEnv });
else dotenv.config();

const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = Number(process.env.DB_PORT || 3307);
const DB_NAME = process.env.DB_NAME || "test";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS ?? "";

console.log(`🗄️  MySQL -> ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME} (pass=${DB_PASS ? "***" : "(empty)"})`);
if (!DB_PASS) console.warn("⚠️ DB_PASS 未設定，目前將以『無密碼』嘗試連線（多半會被拒絕）");

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "mysql",
  logging: false,
  timezone: "+08:00",
  dialectOptions: { dateStrings: true, typeCast: true },

  // ★ 跟你現有資料表一致：全部採用駝峰欄位
  define: {
    timestamps: true,     // 自動 createdAt / updatedAt（駝峰）
    underscored: false,   // 不轉 snake_case，避免 *_id / created_at 錯誤
  },

  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

export default sequelize;
