// backend/src/models/WarehouseItem.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const WarehouseItem = sequelize.define(
    "WarehouseItem",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      // ✅ 封面圖（相容舊版）
      imageFileId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: "封面圖檔案 ID（files.id）",
      },

      // 品名
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "品名",
      },

      // 料號 / 資產編號（可重複）
      code: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "料號 / 資產編號",
      },

      // ✅ 類別：machine/part/tool/fixture/other（已移除 instrument）
      type: {
        type: DataTypes.ENUM("machine", "part", "tool", "fixture", "other"),
        allowNull: false,
        defaultValue: "tool",
        comment: "品項類別",
      },

      // 存放位置
      location: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "存放位置",
      },

      // 總數量
      totalQty: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: "總數量",
      },

      // 目前可借數量
      currentQty: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: "目前可借數量",
      },

      // ✅ 狀態：normal / partial_damage / disabled_scrap
      status: {
        type: DataTypes.ENUM("normal", "partial_damage", "disabled_scrap"),
        allowNull: false,
        defaultValue: "normal",
        comment: "品項狀態",
      },

      // ✅ 是否有周邊
      hasPeripheral: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "是否有周邊",
      },

      // ✅ OS：Win10 / Win11（可為 null）
      os: {
        type: DataTypes.STRING(16),
        allowNull: true,
        comment: "OS（Win10/Win11）",
      },

      remark: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "備註",
      },

      createdBy: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "建立者 ID",
      },

      // 軟刪除
      isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "軟刪除",
      },
    },
    {
      tableName: "warehouse_items",
      timestamps: true,
      comment: "倉庫品項表",

      defaultScope: {
        where: { isDeleted: false },
        order: [["name", "ASC"]],
        attributes: { exclude: ["isDeleted"] },
      },
      scopes: {
        withDeleted: { attributes: { include: ["isDeleted"] } },
        onlyDeleted: { where: { isDeleted: true } },
      },

      indexes: [
        { fields: ["name"] },
        { fields: ["code"] },
        { fields: ["type"] },
        { fields: ["status"] },
        { fields: ["hasPeripheral"] },
        { fields: ["os"] },
        { fields: ["isDeleted"] },
        { fields: ["imageFileId"] },
      ],

      hooks: {
        beforeValidate(row) {
          if (row.name) row.name = String(row.name).trim();
          if (row.code) row.code = String(row.code).trim();
          if (row.location) row.location = String(row.location).trim();
          if (row.remark) row.remark = String(row.remark).trim();

          // ✅ type 白名單（已移除 instrument）
          if (row.type) {
            const t = String(row.type).trim().toLowerCase();
            if (["machine", "part", "tool", "fixture", "other"].includes(t)) {
              row.type = t;
            } else {
              row.type = "tool";
            }
          }

          // ✅ status 白名單：normal / partial_damage / disabled_scrap
          if (row.status) {
            const s = String(row.status).trim().toLowerCase();
            if (["normal", "partial_damage", "disabled_scrap"].includes(s)) {
              row.status = s;
            } else {
              row.status = "normal";
            }
          }

          // ✅ hasPeripheral：轉 boolean
          if (row.hasPeripheral != null) {
            const v = row.hasPeripheral;
            row.hasPeripheral =
              v === true ||
              v === 1 ||
              v === "1" ||
              String(v).trim().toLowerCase() === "true";
          } else {
            row.hasPeripheral = false;
          }

          // ✅ os：允許 null / ""；僅 Win10/Win11 合法
          if (row.os == null || row.os === "") {
            row.os = null;
          } else {
            const os = String(row.os).trim();
            row.os = ["Win10", "Win11"].includes(os) ? os : null;
          }

          // imageFileId：允許 null；若有值就轉數字
          if (row.imageFileId != null && row.imageFileId !== "") {
            const n = Number(row.imageFileId);
            row.imageFileId = Number.isFinite(n) && n > 0 ? n : null;
          }
        },
      },
    }
  );

  // 序列化時隱藏 isDeleted
  WarehouseItem.prototype.toJSON = function () {
    const v = { ...this.get() };
    delete v.isDeleted;
    return v;
  };

  WarehouseItem.associate = (models) => {
    WarehouseItem.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
    });

    WarehouseItem.hasMany(models.BorrowRecord, {
      foreignKey: "itemId",
      as: "borrows",
    });

    // ✅ 封面圖：關聯檔案中心
    WarehouseItem.belongsTo(models.File, {
      foreignKey: "imageFileId",
      as: "imageFile",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    // ✅ 多張圖（相簿）
    WarehouseItem.hasMany(models.WarehouseItemImage, {
      foreignKey: "itemId",
      as: "images",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return WarehouseItem;
};
