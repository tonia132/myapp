// backend/src/models/Chamber.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Chamber = sequelize.define(
    "Chamber",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "設備名稱/編號",
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: "顯示標題",
      },
      model: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "設備型號",
      },
      image: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "圖片相對路徑",
      },
    },
    {
      tableName: "chambers",
      timestamps: true,
      underscored: false, // 與大多數模型一致（createdAt/updatedAt）
      indexes: [
        { fields: ["name"] },
        { fields: ["model"] },
      ],
      hooks: {
        beforeValidate(c) {
          if (c.name) c.name = String(c.name).trim();
          if (c.title) c.title = String(c.title).trim();
          if (c.model) c.model = String(c.model).trim();
        },
      },
    }
  );

  // 如未在 models/index.js 統一關聯，也可在此補上（與 index.js 的 foreignKey 對齊）
  Chamber.associate = (models) => {
    Chamber.hasMany(models.Schedule, {
      foreignKey: "chamber_id",
      as: "schedules",
    });
  };

  return Chamber;
};
