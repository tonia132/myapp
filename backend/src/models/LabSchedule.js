// backend/src/models/LabSchedule.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const LabSchedule = sequelize.define(
    "LabSchedule",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      labType: {
        type: DataTypes.ENUM("EMS", "EMCSI", "IP", "IK"),
        allowNull: false,
        comment: "實驗室類型 (EMS / EMCSI / IP / IK)",
      },

      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: "排程日期",
      },

      startTime: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: "開始時間 (HH:mm)",
      },

      endTime: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: "結束時間 (HH:mm)",
      },

      purpose: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "用途說明",
      },

      remark: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "備註",
      },

      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "申請人 User ID",
      },

      // ✅ 這個就是「審核狀態」+ 後續狀態（你原本就做得對）
      status: {
        type: DataTypes.ENUM(
          "pending",
          "approved",
          "rejected",
          "canceled",
          "finished"
        ),
        allowNull: false,
        defaultValue: "pending",
        comment: "狀態",
      },

      adminRemark: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "管理員備註 / 審核說明",
      },

      // ✅ 新增：審核者 / 審核時間（通過/退回都會填）
      approvedBy: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: "審核者 ID（Users.id）",
      },

      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "審核時間",
      },
    },
    {
      tableName: "lab_schedules",
      timestamps: true,
      comment: "實驗室排程表",
      defaultScope: {
        order: [
          ["date", "DESC"],
          ["startTime", "ASC"],
        ],
      },
      indexes: [
        { fields: ["labType", "date"] },
        { fields: ["userId"] },
        { fields: ["status"] },
        { fields: ["approvedBy"] }, // ✅ 新增
        {
          name: "idx_lab_date_time",
          fields: ["labType", "date", "startTime", "endTime"],
        },
      ],
      hooks: {
        beforeValidate(row) {
          if (row.purpose) row.purpose = String(row.purpose).trim();
          if (row.remark) row.remark = String(row.remark).trim();
          if (row.adminRemark) row.adminRemark = String(row.adminRemark).trim();
        },
      },
    }
  );

  LabSchedule.associate = (models) => {
    LabSchedule.belongsTo(models.User, {
      foreignKey: "userId",
      as: "requester",
    });

    // ✅ 新增：審核者
    LabSchedule.belongsTo(models.User, {
      foreignKey: "approvedBy",
      as: "approver",
    });
  };

  return LabSchedule;
};
