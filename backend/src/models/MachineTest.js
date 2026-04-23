// backend/src/models/MachineTest.js
import { DataTypes, Op } from "sequelize";

export default (sequelize) => {
  const MachineTest = sequelize.define(
    "MachineTest",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },

      machineId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "所屬機台 ID",
      },

      testProject: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "測試專案",
      },

      // ⚠️ 與 DB 既有欄位對齊：程式層使用 testName，但實際欄位仍為 `testItem`
      testName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "testItem",
        comment: "測試項目/名稱（DB 欄位為 testItem）",
      },

      testDetails: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "測試詳細說明",
      },

      tester: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "測試人員",
      },

      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "pending",
        comment: "狀態 (pending / running / completed / error)",
        validate: {
          isIn: {
            args: [["pending", "running", "completed", "error"]],
            msg: "status 必須為 pending / running / completed / error 其中之一",
          },
        },
      },

      progress: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: "進度百分比 0–100",
        validate: {
          min: { args: [0], msg: "progress 不能小於 0" },
          max: { args: [100], msg: "progress 不能大於 100" },
        },
      },

      startTime: { type: DataTypes.DATE, allowNull: true, comment: "開始時間" },
      endTime: { type: DataTypes.DATE, allowNull: true, comment: "結束時間" },

      result: { type: DataTypes.TEXT, allowNull: true, comment: "測試結果" },
      remark: { type: DataTypes.TEXT, allowNull: true, comment: "備註" },
    },
    {
      tableName: "machine_tests",
      timestamps: true,
      underscored: false,
      comment: "機台測試紀錄表",

      defaultScope: {
        order: [
          ["startTime", "DESC"],
          ["createdAt", "DESC"],
        ],
      },

      scopes: {
        byMachine(machineId) {
          return { where: { machineId } };
        },
        running: { where: { status: "running" } },
        completed: { where: { status: "completed" } },
        // 目前視為「有效進行中」：startTime ≤ now 且 (endTime 為 null 或 > now)
        active() {
          const now = new Date();
          return {
            where: {
              startTime: { [Op.lte]: now },
              [Op.or]: [{ endTime: null }, { endTime: { [Op.gt]: now } }],
            },
          };
        },
      },

      indexes: [
        { fields: ["machineId"] },
        { fields: ["status"] },
        { fields: ["startTime"] },
        { fields: ["endTime"] },
        { fields: ["machineId", "status"] },
      ],

      hooks: {
        // 統一清洗＆正規化
        beforeValidate(instance) {
          ["testProject", "testName", "tester", "status"].forEach((k) => {
            if (instance[k] != null) instance[k] = String(instance[k]).trim();
          });
          if (instance.status) instance.status = String(instance.status).toLowerCase();

          // 進度容錯：自動夾在 0~100
          if (typeof instance.progress === "number") {
            if (instance.progress < 0) instance.progress = 0;
            if (instance.progress > 100) instance.progress = 100;
          }
        },

        // 若狀態改為 running 且尚未設定 startTime，幫忙補上
        beforeSave(instance) {
          if (instance.changed("status") && instance.status === "running" && !instance.startTime) {
            instance.startTime = new Date();
          }

          // 若已填 endTime 且 progress 未 100，但狀態為 completed，就補 100（僅友善處理）
          if (instance.status === "completed" && instance.endTime && (instance.progress ?? 0) < 100) {
            instance.progress = 100;
          }
        },
      },

      // 區間邏輯
      validate: {
        endAfterStart() {
          if (this.endTime && this.startTime && this.endTime <= this.startTime) {
            throw new Error("endTime 必須大於 startTime");
          }
        },
      },
    }
  );

  // 🧩 關聯
  MachineTest.associate = (models) => {
    MachineTest.belongsTo(models.Machine, { foreignKey: "machineId", as: "machine" });
  };

  return MachineTest;
};
