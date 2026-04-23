// backend/src/models/User.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      username: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: "登入帳號",
      },

      name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "姓名",
      },

      email: {
        type: DataTypes.STRING(191),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
        comment: "電子郵件",
      },

      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "加密後密碼",
      },

      // 🔹 這裡加上 "guest"
      role: {
        type: DataTypes.ENUM("admin", "user", "supervisor", "guest"),
        allowNull: false,
        defaultValue: "guest",
        comment: "角色權限",
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "是否啟用",
      },

      // 🆕 使用者工作容量（預設 3）
      workCapacity: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 3,
        comment: "使用者工作容量",
      },

      // 🆕 是否納入使用者工作量統計
      includeInStats: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "是否納入工作量統計",
      },

      // ✅ 忘記/重設密碼用（可為 null）
      resetTokenHash: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: "重設密碼 token 的 SHA-256 雜湊",
      },
      resetTokenExpires: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "重設密碼 token 到期時間",
      },
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: false,
      comment: "使用者資料表",
      defaultScope: {
        // 對外查詢時預設隱藏敏感欄位
        attributes: {
          exclude: ["password", "resetTokenHash", "resetTokenExpires"],
        },
      },
      scopes: {
        // 需要帶出敏感欄位時：User.scope('withSecrets').findOne(...)
        withSecrets: {},
      },
      indexes: [
        { unique: true, fields: ["email"] },
        { unique: true, fields: ["username"] },
        { fields: ["role"] },
        // 🆕 如果之後統計常用到，可以順便幫 includeInStats 建個 index（非必要）
        { fields: ["includeInStats"] },
      ],
      hooks: {
        // 統一格式，避免與 unique index 衝突
        beforeValidate(user) {
          if (user.username)
            user.username = String(user.username).trim().toLowerCase();
          if (user.email)
            user.email = String(user.email).trim().toLowerCase();
          if (user.name) user.name = String(user.name).trim();
        },
      },
    }
  );

  // 保險：序列化時移除敏感欄位（即使有自訂查詢也不外漏）
  User.prototype.toJSON = function () {
    const v = { ...this.get() };
    delete v.password;
    delete v.resetTokenHash;
    delete v.resetTokenExpires;
    return v;
  };

  User.associate = (models) => {
    User.hasMany(models.Product, { foreignKey: "createdBy", as: "products" });
    User.hasMany(models.TestCase, { foreignKey: "createdBy", as: "testCases" });
    User.hasMany(models.DefaultTestSet, {
      foreignKey: "createdBy",
      as: "defaultTestSets",
    });
    User.hasMany(models.Suggestion, {
      foreignKey: "userId",
      as: "suggestions",
    });
    User.hasMany(models.AuditLog, {
      foreignKey: "actorId",
      as: "auditLogs",
    });
    User.hasMany(models.SOP, { foreignKey: "createdBy", as: "sops" });
    User.hasMany(models.SOP_Approval, {
      foreignKey: "userId",
      as: "approvals",
    });
    User.hasMany(models.Machine, {
      foreignKey: "createdBy",
      as: "machines",
    });
    User.hasMany(models.MachineSchedule, {
      foreignKey: "createdBy",
      as: "schedules",
    });

    // 可選：如果需要從 User 反查支援紀錄
    // User.hasMany(models.TestSupport, {
    //   foreignKey: "supporterId",
    //   as: "testSupports",
    // });
  };

  return User;
};
