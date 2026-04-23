// backend/src/models/WarehouseItemImage.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const WarehouseItemImage = sequelize.define(
    "WarehouseItemImage",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },

      itemId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      fileId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },

      sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    },
    {
      tableName: "warehouse_item_images",
      timestamps: true,
      indexes: [{ fields: ["itemId"] }, { fields: ["fileId"] }, { fields: ["sortOrder"] }],
    }
  );

  return WarehouseItemImage;
};
