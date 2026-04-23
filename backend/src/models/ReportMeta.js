// backend/src/models/ReportMeta.js
import { DataTypes } from "sequelize";

function safeJsonParse(v, def) {
  if (v === null || v === undefined || v === "") return def;
  if (typeof v === "object") return v; // mysql2 有時會直接回 object
  try {
    return JSON.parse(String(v));
  } catch {
    return def;
  }
}
function safeJsonStringify(v, def) {
  if (v === null || v === undefined) return JSON.stringify(def);

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return JSON.stringify(def);
    try {
      JSON.parse(s);     // ✅ 先驗證
      return s;
    } catch {
      return JSON.stringify(def);
    }
  }

  try {
    return JSON.stringify(v);
  } catch {
    return JSON.stringify(def);
  }
}


export default (sequelize) => {
  const ReportMeta = sequelize.define(
    "ReportMeta",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      productId: { type: DataTypes.INTEGER, allowNull: false },

      reportName: { type: DataTypes.STRING(255), allowNull: false, defaultValue: "Test Report" },
      revision: { type: DataTypes.STRING(50), allowNull: false, defaultValue: "0.1" },
      tplVersion: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "v0006" },

      // ✅ JSON：用 TEXT 存，但提供 getter/setter 讓你 API 看到的是 object
      flagsJson: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
        defaultValue: safeJsonStringify(
          {
            sections: {
              hw: true,
              perf: true,
              reli: true,
              stab: true,
              pwr: true,
              thrm: true,
              esd: true,
              mep: true,
            },
          },
          {}
        ),
        get() {
          return safeJsonParse(this.getDataValue("flagsJson"), { sections: {} });
        },
        set(v) {
          this.setDataValue("flagsJson", safeJsonStringify(v, { sections: {} }));
        },
      },

      configJson: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
        defaultValue: safeJsonStringify({}, {}),
        get() {
          return safeJsonParse(this.getDataValue("configJson"), {});
        },
        set(v) {
          this.setDataValue("configJson", safeJsonStringify(v, {}));
        },
      },

      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },

      // ✅ v0006 cover / summary 需要的欄位
      projectName: { type: DataTypes.STRING(255), allowNull: true },
      reportNo: { type: DataTypes.STRING(64), allowNull: true },
      revisionName: { type: DataTypes.STRING(64), allowNull: true },
      releasedDate: { type: DataTypes.DATEONLY, allowNull: true },

      preparedBy: { type: DataTypes.STRING(128), allowNull: true },
      approvedBy: { type: DataTypes.STRING(128), allowNull: true },

      preparedSignatureFileId: { type: DataTypes.INTEGER, allowNull: true },
      approvedSignatureFileId: { type: DataTypes.INTEGER, allowNull: true },

      preparedSignatureName: { type: DataTypes.STRING(128), allowNull: true },
      approvedSignatureName: { type: DataTypes.STRING(128), allowNull: true },

      summaryRemark: { type: DataTypes.TEXT("long"), allowNull: true },
    },
    {
      tableName: "report_metas",
      timestamps: true,
    }
  );

  return ReportMeta;
};
