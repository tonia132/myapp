// backend/src/models/Schedule.js
import { DataTypes, Op } from "sequelize";

export default (sequelize) => {
  const Schedule = sequelize.define(
    "Schedule",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },

      // 程式層使用駝峰；實際欄位仍為 chamber_id
      chamberId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "chamber_id",
        comment: "所屬環測箱/機台 ID",
      },

      project: { type: DataTypes.STRING, allowNull: true },
      item: { type: DataTypes.STRING, allowNull: true },
      tester: { type: DataTypes.STRING, allowNull: true },

      startTime: { type: DataTypes.DATE, allowNull: true, field: "start_time" },
      endTime: { type: DataTypes.DATE, allowNull: true, field: "end_time" },

      progress: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: "progress 不能小於 0" },
          max: { args: [100], msg: "progress 不能大於 100" },
        },
      },
    },
    {
      tableName: "schedules",
      timestamps: true,
      underscored: true,
      comment: "環測箱/機台排程",

      defaultScope: {
        order: [
          ["start_time", "DESC"],
          ["createdAt", "DESC"],
        ],
      },

      scopes: {
        byChamber(chamberId) {
          return { where: { chamberId } }; // 使用屬性名（非欄位名）
        },
        active() {
          const now = new Date();
          return {
            where: {
              startTime: { [Op.lte]: now },
              [Op.or]: [{ endTime: null }, { endTime: { [Op.gt]: now } }],
            },
          };
        },
        upcoming() {
          const now = new Date();
          return { where: { startTime: { [Op.gt]: now } } };
        },
        past() {
          const now = new Date();
          return { where: { endTime: { [Op.lt]: now } } };
        },
      },

      indexes: [
        { fields: ["chamber_id"] },
        { fields: ["start_time"] },
        { fields: ["end_time"] },
        { fields: ["chamber_id", "start_time"] },
      ],

      hooks: {
        beforeValidate(s) {
          ["project", "item", "tester"].forEach((k) => {
            if (s[k] != null) s[k] = String(s[k]).trim();
          });
          if (typeof s.progress === "number") {
            if (s.progress < 0) s.progress = 0;
            if (s.progress > 100) s.progress = 100;
          }
        },
      },

      validate: {
        endAfterStart() {
          if (this.endTime && this.startTime && this.endTime <= this.startTime) {
            throw new Error("end_time 必須大於 start_time");
          }
        },
      },
    }
  );

  // 關聯（對齊 models/index.js 的 foreignKey 與 as）
  Schedule.associate = (models) => {
    Schedule.belongsTo(models.Chamber, { foreignKey: "chamber_id", as: "chamber" });
  };

  return Schedule;
};
