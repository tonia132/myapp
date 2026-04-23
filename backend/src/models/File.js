// backend/src/models/File.js
import { DataTypes } from "sequelize";
import crypto from "node:crypto"; // 🔹 用來產生隨機 storedName

// 分類白名單（要跟 routes/files.js 的內容一致）
export const FILE_CATEGORY_WHITELIST = [
  "general",
  "SOP",
  "Report",
  "Machine",
  "Image",
  "Dataset",
  "Other",
  "OS",
  "Driver",
  "Firmware",
  "認證",
];

// 小寫 → 標準值對應表
const CATEGORY_MAP_LOWER = {
  general: "general",
  sop: "SOP",
  report: "Report",
  machine: "Machine",
  image: "Image",
  dataset: "Dataset",
  other: "Other",
  os: "OS",
  driver: "Driver",
  firmware: "Firmware",
  cert: "認證",
  "認證": "認證",
};

// 🔹 統一的分類正規化（跟 routes 那邊邏輯一樣）
// 特色：
// - 白名單內會標準化（例如 sop -> SOP）
// - 不認得的分類會保留原字串（不硬洗回 general）
// - 為了「允許自訂分類」，category 欄位不使用 isIn 白名單硬驗證
function normalizeCategory(value, fallback = "general") {
  if (value == null) return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;

  // OS 特例
  if (raw.toUpperCase() === "OS") return "OS";

  // 直接在白名單裡就用原值
  if (FILE_CATEGORY_WHITELIST.includes(raw)) return raw;

  const lower = raw.toLowerCase();
  if (CATEGORY_MAP_LOWER[lower]) return CATEGORY_MAP_LOWER[lower];

  // 不認得就保留原字串（避免硬洗回 general）
  return raw || fallback;
}

// 🔹 資料夾 storedName 產生器：不會真的建檔案，只用來避免 UNIQUE 撞名
function genFolderStoredName() {
  return `dir_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

export default (sequelize) => {
  const File = sequelize.define(
    "File",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      // ✅ 實際 DB 欄位對應（有些是 snake_case、有些是駝峰）
      originalName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "original_name",
      },

      displayName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "display_name",
      },

      storedName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "storedName", // DB 就是駝峰
      },

      ext: {
        type: DataTypes.STRING(32),
        allowNull: true,
        field: "ext",
      },

      size: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "size",
      },

      mimeType: {
        type: DataTypes.STRING(127),
        allowNull: false,
        field: "mime_type",
      },

      // 分類：允許白名單與自訂值（白名單會被 normalize 成標準值）
      category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "general",
        field: "category",
        validate: {
          notEmpty: true,
          isValidCategory(v) {
            const s = String(v ?? "").trim();
            if (!s) throw new Error("category 不可為空");
            if (s.length > 50) throw new Error("category 長度不可超過 50");
          },
        },
      },

      // 實體路徑：資料表欄位是 absPath（駝峰）
      path: {
        type: DataTypes.STRING(512),
        allowNull: false,
        field: "absPath",
      },

      // 上傳者外鍵：資料表欄位是 uploader_id（底線）
      uploaderId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "uploader_id",
      },

      // 兼容舊資料：DB 有此欄位，但系統已改「刪除即永久刪除」不再寫入 true
      isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "isDeleted",
      },

      // 是否為資料夾
      isFolder: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "isFolder",
      },

      // 父層資料夾（根目錄為 null）
      parentId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "parent_id",
      },
    },
    {
      tableName: "files",
      underscored: false,
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",

      // 預設不回傳實體路徑（避免把絕對路徑洩漏出去）
      defaultScope: {
        attributes: { exclude: ["path"] },
      },
      scopes: {
        withPath: { attributes: { include: ["path"] } },
      },

      indexes: [
        { fields: ["category"] },
        { fields: ["uploader_id", "category"] },
        { fields: ["parent_id"] },
        { fields: ["parent_id", "isFolder", "isDeleted"] }, // 舊系統兼容（可保留）
      ],

      hooks: {
        beforeValidate(row) {
          // ✅ 用 normalizeCategory（白名單會標準化；未知分類保留）
          if (row.category != null) {
            row.category = normalizeCategory(row.category, "general");
          }

          // 🔹 資料夾預設一些欄位（避免忘記填）
          if (row.isFolder) {
            if (row.size == null) row.size = 0;
            if (!row.mimeType) row.mimeType = "inode/directory";
            if (row.path == null) row.path = "";

            // 沒有 storedName 的資料夾，自動產生唯一值，避免撞 UNIQUE
            if (!row.storedName) {
              row.storedName = genFolderStoredName();
            }
          }
        },
      },
    }
  );

  // 關聯：User 1..* File
  File.associate = (models) => {
    File.belongsTo(models.User, {
      as: "uploader",
      foreignKey: "uploaderId",
    });
  };

  return File;
};
