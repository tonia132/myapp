// backend/src/models/DefaultTestSetItem.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const DefaultTestSetItem = sequelize.define(
    "DefaultTestSetItem",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      // ✅ FK：DefaultTestSet.id
      testSetId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "default_test_sets.id",
      },

      // 你的 ProductTest.vue 需要的欄位
      category: { type: DataTypes.STRING(40), allowNull: true },
      section: { type: DataTypes.STRING(120), allowNull: true },

      code: { type: DataTypes.STRING(120), allowNull: false },
      testCase: { type: DataTypes.STRING(500), allowNull: true },

      testProcedure: { type: DataTypes.TEXT, allowNull: true },
      testCriteria: { type: DataTypes.TEXT, allowNull: true },

      estHours: { type: DataTypes.DECIMAL(6, 1), allowNull: true, defaultValue: 0 },
      isPlanned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

      orderNo: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: 0 },
    },
    {
      tableName: "default_test_set_items",
      indexes: [
        { name: "idx_dtsi_testSetId", fields: ["testSetId"] },
        { name: "idx_dtsi_code", fields: ["code"] },
        { name: "uq_dtsi_set_code", unique: true, fields: ["testSetId", "code"] },
      ],
    }
  );

  return DefaultTestSetItem;
};
