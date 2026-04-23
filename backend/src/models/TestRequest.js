// backend/src/models/TestRequest.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const TestRequest = sequelize.define(
    "TestRequest",
    {
      requestNo: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      productName: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "HW",
      },
      testItemCount: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      sampleQty: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      priority: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "medium",
      },
      expectedStartDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      expectedEndDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "pending",
      },
      remark: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },

      // 🆕 指派給哪位使用者
      assignedTo: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
    },
    {
      tableName: "test_requests",
    }
  );

  return TestRequest;
};
