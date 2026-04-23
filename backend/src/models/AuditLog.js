// backend/src/models/AuditLog.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      // 操作者
      actorId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: "操作使用者 ID",
      },

      // 動作
      action: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "操作動作 (LOGIN / CREATE / UPDATE / DELETE / ...)",
      },

      // 與 logs.js 對齊：資源名稱（如 products / users / machine_schedules）
      resource: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "資源/模組名稱",
      },

      // 目標資料（選填）
      targetType: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "目標資料類型（Product, TestCase, Machine ...）",
      },
      targetId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: "目標資料 ID",
      },

      // 人工描述（選填）
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "簡要說明",
      },

      // ✅ 與前端對齊：使用 `detail`（非 details）
      detail: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "詳細內容（建議存 JSON 字串）",
      },

      ip: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: "IP 位址",
      },

      // 使用單一 createdAt 欄位
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "audit_logs",
      timestamps: false, // 只用 createdAt
      comment: "操作日誌紀錄表",
      // ✅ 顯式命名，避免撞到舊的 audit_logs_actor_id
      indexes: [
        { name: "idx_audit_logs_createdAt", fields: ["createdAt"] },
        { name: "idx_audit_logs_action", fields: ["action"] },
        { name: "idx_audit_logs_resource", fields: ["resource"] },
        { name: "idx_audit_logs_actorId", fields: ["actorId"] },
      ],
    }
  );

  // ✅ 與前端對齊：as 改為 "user"
  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, {
      foreignKey: "actorId",
      as: "user",
    });
  };

  return AuditLog;
};
