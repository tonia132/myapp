// backend/src/models/Suggestion.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Suggestion = sequelize.define(
    "Suggestion",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "標題",
      },

      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "內容",
      },

      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "使用者 ID",
      },

      // 🔹 優先度：P1 高、P2 中、P3 低
      priority: {
        type: DataTypes.ENUM("P1", "P2", "P3"),
        allowNull: false,
        defaultValue: "P2",
        comment: "優先度：P1 高, P2 中, P3 低",
      },

      // 🔹 狀態：pending 待處理、reviewed 已審閱、resolved 已結案
      status: {
        type: DataTypes.ENUM("pending", "reviewed", "resolved"),
        allowNull: false,
        defaultValue: "pending",
        comment: "狀態：pending 待處理, reviewed 已審閱, resolved 已結案",
      },

      // 🔹 管理員回覆
      adminReply: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "管理員回覆",
      },
    },
    {
      tableName: "suggestions",
      timestamps: true,
      comment: "使用者意見表",
      defaultScope: {
        order: [["createdAt", "DESC"]],
      },
      indexes: [
        { fields: ["userId"] },
        { fields: ["status"] },
        { fields: ["priority"] },
        { fields: ["createdAt"] },
        // 後台常見：依使用者+狀態+時間查詢
        {
          name: "idx_user_status_createdAt",
          fields: ["userId", "status", "createdAt"],
        },
      ],
      hooks: {
        beforeValidate(row) {
          if (row.title) row.title = String(row.title).trim();
          if (row.content) row.content = String(row.content).trim();
          if (row.adminReply != null)
            row.adminReply = String(row.adminReply).trim();
        },
      },
    }
  );

  Suggestion.associate = (models) => {
    Suggestion.belongsTo(models.User, {
      foreignKey: "userId",
      as: "creator",
    });
  };

  return Suggestion;
};
