// backend/src/models/Product.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Product = sequelize.define(
    "Product",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },

      name: { type: DataTypes.STRING(255), allowNull: false, comment: "產品名稱" },
      model: { type: DataTypes.STRING(100), allowNull: false, comment: "型號" },
      description: { type: DataTypes.TEXT, allowNull: true, comment: "產品說明" },

      createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, comment: "建立者 ID" },

      // ✅ 測試類型（x86 / arm / display / part）
      testType: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "x86",
        comment: "測試類型：x86 | arm | display | part",
      },

      // ✅ soft delete
      isDeleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, comment: "軟刪除" },

      // ✅ 測試進度百分比（0~100）
      progress: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: "測試進度百分比 (0~100)",
        validate: { min: 0, max: 100 },
      },

      // ✅ Plan Locked
      planLocked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "是否鎖定測試計畫",
      },

      /**
       * ⚠️ DB 欄位叫 reportMeta（TEXT）
       * attribute 若也叫 reportMeta，會跟 hasOne 的 as 撞名
       * 所以用 reportMetaRaw 映射到 reportMeta 欄位
       */
      reportMetaRaw: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
        field: "reportMeta",
        comment: "Legacy report meta (TEXT/JSON-string)",
      },

      // ✅ Test Plan Draft（UI 草稿）
      testPlanDraft: { type: DataTypes.JSON, allowNull: true, comment: "ProductTest 草稿 JSON" },

      testPlanDraftUpdatedBy: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: "草稿最後更新者",
      },

      testPlanDraftUpdatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "草稿最後更新時間",
      },
    },
    {
      tableName: "products",
      timestamps: true,
      underscored: false,

      defaultScope: {
        where: { isDeleted: false },
        attributes: {
          exclude: [
            "isDeleted",
            "reportMetaRaw",
            "testPlanDraft",
            "testPlanDraftUpdatedBy",
            "testPlanDraftUpdatedAt",
          ],
        },
      },

      indexes: [
        { fields: ["createdBy"] },
        { fields: ["name"] },
        { fields: ["model"] },
        { fields: ["testType"] },
        { fields: ["planLocked"] },
        { fields: ["isDeleted"] },
        { fields: ["testPlanDraftUpdatedAt"] },
      ],

      hooks: {
        beforeValidate(row) {
          if (row.name != null) row.name = String(row.name).trim();
          if (row.model != null) row.model = String(row.model).trim();

          // ✅ 正規化 testType（避免亂值）
          if (row.testType != null) {
            const v = String(row.testType).trim().toLowerCase();

            if (["part", "parts", "object", "component", "device"].includes(v)) {
              row.testType = "part";
            } else if (["arm"].includes(v)) {
              row.testType = "arm";
            } else if (["display", "disp", "monitor", "screen"].includes(v)) {
              row.testType = "display";
            } else {
              row.testType = "x86";
            }
          }
        },
      },
    }
  );

  Product.addScope(
    "withDeleted",
    { where: {}, attributes: { include: ["isDeleted"] } },
    { override: true }
  );

  Product.addScope(
    "onlyDeleted",
    { where: { isDeleted: true }, attributes: { include: ["isDeleted"] } },
    { override: true }
  );

  Product.associate = (models) => {
    Product.belongsTo(models.User, { foreignKey: "createdBy", as: "creator" });

    Product.hasMany(models.TestCase, {
      foreignKey: "productId",
      as: "testCases",
      onDelete: "CASCADE",
    });

    if (models.ReportMeta) {
      Product.hasOne(models.ReportMeta, {
        foreignKey: "productId",
        as: "meta",
        onDelete: "CASCADE",
      });
    }
  };

  return Product;
};