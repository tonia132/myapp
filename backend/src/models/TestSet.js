import { DataTypes } from "sequelize";

export default (sequelize) => {
  const TestSet = sequelize.define(
    "TestSet",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(255), allowNull: false },
      version: { type: DataTypes.STRING(50), allowNull: true },
      templateKey: { type: DataTypes.STRING(80), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },

      isPublic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      isDeleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

      createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: "test_sets" }
  );

  return TestSet;
};
