// backend/src/models/TestCase.js
import { DataTypes } from "sequelize";

const RESULT_VALUES = ["pass", "fail", "pending"];

/**
 * ✅ normalize extra:
 * - allow: null | object | array
 * - if string JSON => try parse
 * - reject: number/boolean/invalid string => set null
 */
function normalizeExtra(val) {
  if (val === null || val === undefined) return null;

  // If stored as JSON string (some older code / DB)
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return null;
    try {
      const parsed = JSON.parse(s);
      if (parsed && (typeof parsed === "object" || Array.isArray(parsed))) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  if (Array.isArray(val)) return val;
  if (typeof val === "object") return val;

  return null;
}

/**
 * ✅ 正規化 extra 裡的 show flags（不新增預設、不覆蓋不存在的 key，只把型別轉正）
 * - "1"/1/"true" => true
 * - "0"/0/"false" => false
 */
function normalizeExtraShowFlags(extra) {
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) return extra;

  const out = { ...extra };

  const toBoolMaybe = (v) => {
    if (v === true || v === false) return v;
    if (v === 1 || v === "1") return true;
    if (v === 0 || v === "0") return false;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (["true", "yes", "y", "on"].includes(s)) return true;
      if (["false", "no", "n", "off"].includes(s)) return false;
    }
    return undefined;
  };

  const keys = [
    "envEnabled",
    "showInputVoltage",
    "showTemperature",
    "showHumidity",
    "showCpu",
    "showMemory",
    "showDisk",
  ];

  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(out, k)) {
      const b = toBoolMaybe(out[k]);
      if (b !== undefined) out[k] = b;
    }
  }

  return out;
}

/**
 * ✅ 正規化 extra 裡的環境欄位（不覆蓋既有值，只補缺）
 * - 支援常見別名：voltage/temp/hum...
 * - 將字串數字轉成 number
 * - extra 若為 array/null → 原樣回傳
 * - 同步處理 cpuTemp/memoryTemp/memTemp/diskTemp 的數字化
 */
function normalizeExtraEnv(extra) {
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) return extra;

  const out = { ...extra };

  const toNumMaybe = (v) => {
    if (v === null || v === undefined) return undefined;
    const s = typeof v === "string" ? v.trim() : v;
    if (s === "") return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  };

  const pickFirstNum = (keys) => {
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(out, k)) {
        const n = toNumMaybe(out[k]);
        if (n !== undefined) return n;
      }
    }
    return undefined;
  };

  // ✅ 先把 canonical 自己也轉成 number（如果是字串）
  for (const k of ["inputVoltage", "temperature", "humidity", "cpuTemp", "memoryTemp", "diskTemp"]) {
    if (Object.prototype.hasOwnProperty.call(out, k)) {
      const n = toNumMaybe(out[k]);
      if (n !== undefined) out[k] = n;
    }
  }

  // ✅ 別名 → canonical（只補缺，不覆蓋）
  const v = pickFirstNum([
    "inputVoltage",
    "input_voltage",
    "inputVolt",
    "input_volt",
    "vin",
    "voltage",
  ]);
  const t = pickFirstNum(["temperature", "temp", "tempC", "temp_c"]);
  const h = pickFirstNum(["humidity", "hum", "humPct", "hum_pct"]);

  if (out.inputVoltage === undefined || out.inputVoltage === null || out.inputVoltage === "") {
    if (v !== undefined) out.inputVoltage = v;
  }
  if (out.temperature === undefined || out.temperature === null || out.temperature === "") {
    if (t !== undefined) out.temperature = t;
  }
  if (out.humidity === undefined || out.humidity === null || out.humidity === "") {
    if (h !== undefined) out.humidity = h;
  }

  // ✅ memTemp → memoryTemp（只補缺，不覆蓋）
  const mem = pickFirstNum(["memoryTemp", "memTemp", "mem_temp", "memory_temperature", "memoryTempC"]);
  if (out.memoryTemp === undefined || out.memoryTemp === null || out.memoryTemp === "") {
    if (mem !== undefined) out.memoryTemp = mem;
  }

  // ✅ disk aliases（只補缺，不覆蓋）
  const disk = pickFirstNum(["diskTemp", "disk_temp", "ssdTemp", "ssd_temp", "disk_temperature", "diskTempC"]);
  if (out.diskTemp === undefined || out.diskTemp === null || out.diskTemp === "") {
    if (disk !== undefined) out.diskTemp = disk;
  }

  return out;
}

export default (sequelize) => {
  const TestCase = sequelize.define(
    "TestCase",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },

      productId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "productId",
        comment: "產品 ID",
      },

      category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "HW",
        comment: "分類 (CPU / Memory ...)",
      },

      code: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "測試項目代碼",
      },

      testCase: { type: DataTypes.STRING(255), allowNull: false, comment: "測試項目" },
      testProcedure: { type: DataTypes.TEXT, allowNull: true, comment: "測試步驟" },
      testCriteria: { type: DataTypes.TEXT, allowNull: true, comment: "測試標準" },
      remark: { type: DataTypes.TEXT, allowNull: true, comment: "備註" },

      result: {
        type: DataTypes.ENUM("pass", "fail", "pending"),
        allowNull: false,
        defaultValue: "pending",
        comment: "結果 (pass / fail / pending)",
      },

      workHrs: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: "工時 (小時)",
      },

      // ✅ 新增：是否納入計畫
      isPlanned: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "isPlanned",
        comment: "是否納入計畫 (Planned)",
      },

      // ✅ 可配置 extra fields（JSON）
      extra: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        comment: "Template-driven extra fields (JSON)",
      },

      createdBy: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "createdBy",
        comment: "建立者 ID",
      },

      isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "isDeleted",
        comment: "軟刪除",
      },
    },
    {
      tableName: "test_cases",
      timestamps: true,
      underscored: false,
      createdAt: "createdAt",
      updatedAt: "updatedAt",

      defaultScope: {
        where: { isDeleted: false },
        order: [["createdAt", "ASC"]],
        attributes: { exclude: ["isDeleted"] },
      },

      scopes: {
        withDeleted: { attributes: { include: ["isDeleted"] } }, // 請搭配 .unscoped()
        onlyDeleted: { where: { isDeleted: true }, attributes: { include: ["isDeleted"] } }, // 請搭配 .unscoped()
        byProduct(productId) {
          return { where: { productId } };
        },
      },

      indexes: [
        { fields: ["productId"] },
        { fields: ["createdBy"] },
        { fields: ["category"] },
        { fields: ["result"] },
        { fields: ["createdAt"] },
        { fields: ["isDeleted"] },
        { fields: ["isPlanned"] },
        { name: "idx_product_category_result", fields: ["productId", "category", "result"] },
      ],

      hooks: {
        beforeValidate(row) {
          if (row.category) row.category = String(row.category).trim().toUpperCase();
          if (row.testCase) row.testCase = String(row.testCase).trim();
          if (row.testProcedure != null) row.testProcedure = String(row.testProcedure).trim();
          if (row.testCriteria != null) row.testCriteria = String(row.testCriteria).trim();
          if (row.remark != null) row.remark = String(row.remark).trim();

          if (row.result) {
            const r = String(row.result).trim().toLowerCase();
            row.result = RESULT_VALUES.includes(r) ? r : "pending";
          }

          if (row.code != null) row.code = String(row.code).trim();
          if (row.isPlanned != null) row.isPlanned = !!row.isPlanned;

          // ✅ normalize workHrs（避免匯入時字串/空值導致 0 或 NaN；保留小數）
          if ("workHrs" in row)  {
            const n = Number(row.workHrs);
            row.workHrs = Number.isFinite(n) ? n : 0;
            if (row.workHrs < 0) row.workHrs = 0;
          }

          // ✅ normalize extra（含：show flags + env numeric）
          if ("extra" in row) {
            row.extra = normalizeExtra(row.extra);
            row.extra = normalizeExtraShowFlags(row.extra);
            row.extra = normalizeExtraEnv(row.extra);
          }
        },
      },
    }
  );

  TestCase.prototype.toJSON = function () {
    const v = { ...this.get() };
    delete v.isDeleted; // 預設 scope 已 exclude，但這裡再保險
    return v;
  };

  TestCase.associate = (models) => {
    TestCase.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
      onDelete: "CASCADE",
    });
    TestCase.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
    });
  };

  return TestCase;
};
