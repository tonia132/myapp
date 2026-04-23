// backend/src/models/DefaultTestSet.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const DefaultTestSet = sequelize.define(
    "DefaultTestSet",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "預設測試集名稱",
      },

      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "說明文字",
      },

      // 舊版通用測試集資料
      // 每筆 { category, code?, testCase, testProcedure?, testCriteria?, remark? }
      testCases: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: "預設測試案例 JSON 資料",
        validate: {
          isArray(value) {
            if (!Array.isArray(value)) throw new Error("testCases 必須為陣列");
          },
        },
      },

      // ✅ 新版 Part Test / Template Draft 完整 payload
      // 例如：
      // {
      //   schema: "part-test-set/v1",
      //   cover: {},
      //   dut: {},
      //   enabled: {},
      //   sections: [...]
      // }
      payloadJson: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        comment: "Part Test Set 完整 JSON payload",
      },

      createdBy: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "建立者 ID",
      },

      // 來源產品（從哪個 Product 匯出來，可為 null）
      fromProductId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: "來源產品 ID",
      },

      // 其他附帶資訊（例如來源產品名稱/型號）
      meta: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        comment: "附加資訊",
      },
    },
    {
      tableName: "default_test_sets",
      timestamps: true,
      underscored: false,
      defaultScope: { order: [["createdAt", "DESC"]] },
      indexes: [
        { fields: ["createdBy"] },
        { fields: ["name"] },
        { fields: ["fromProductId"] },
      ],
      hooks: {
        beforeValidate(row) {
          if (row.name) row.name = String(row.name).trim();
          if (row.description) row.description = String(row.description).trim();

          // 保底，避免 testCases 變成 null
          if (row.testCases == null) row.testCases = [];

          // 保底，避免 undefined
          if (row.payloadJson === undefined) row.payloadJson = null;
        },
      },
    }
  );

  DefaultTestSet.associate = (models) => {
    DefaultTestSet.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
    });

    DefaultTestSet.belongsTo(models.Product, {
      foreignKey: "fromProductId",
      as: "sourceProduct",
    });
  };

  return DefaultTestSet;
};