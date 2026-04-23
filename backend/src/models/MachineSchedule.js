// backend/src/models/MachineSchedule.js
import { DataTypes, Op } from "sequelize";

export default (sequelize) => {
  const MachineSchedule = sequelize.define(
    "MachineSchedule",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        comment: "排程 ID",
      },

      machineId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "所屬機台 ID",
      },

      // ✅ 排程名稱（若未提供，會在 hook 依 testName + startTime 自動生成）
      scheduleName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "排程名稱",
      },

      testProject: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "測試專案名稱",
      },

      testName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "測試項目名稱",
      },

      // 👇 這三個可以一起用來表示「排程使用者」
      operator: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "測試人員名稱（舊欄位，可當備註）",
      },

      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: "排程使用者 ID（對應 Users.id）",
      },

      userName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "排程使用者名稱（顯示用，通常對應 Users.name）",
      },

      startTime: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: "開始時間",
      },

      // ✅ 允許 null；代表「未設定結束」或「進行中」
      endTime: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "結束時間",
      },

      /* =========================================================
         ✅ 執行狀態（你原本的 status）— 保留不動
      ========================================================= */
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "pending",
        comment: "執行狀態 (pending / running / completed / canceled)",
        validate: {
          isIn: {
            args: [["pending", "running", "completed", "canceled"]],
            msg: "status 必須為 pending / running / completed / canceled 其中之一",
          },
        },
      },

      /* =========================================================
         ✅ 審核狀態（新增）
      ========================================================= */
      reviewStatus: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "pending",
        comment: "審核狀態 (pending / approved / rejected)",
        validate: {
          isIn: {
            args: [["pending", "approved", "rejected"]],
            msg: "reviewStatus 必須為 pending / approved / rejected 其中之一",
          },
        },
      },

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

      reviewNote: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "批准備註（選填）",
      },

      rejectReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "退回原因（必填）",
      },

      remark: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "備註",
      },

      createdBy: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "建立者 ID",
      },

      // 軟刪除
      isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "軟刪除標記",
      },
    },
    {
      tableName: "machine_schedules",
      timestamps: true,
      underscored: false,
      comment: "機台排程表",

      // ✅ 預設過濾掉軟刪除，並以 startTime 由新到舊
      defaultScope: {
        where: { isDeleted: false },
        attributes: { exclude: ["isDeleted"] },
        order: [["startTime", "DESC"]],
      },

      scopes: {
        withDeleted: { attributes: { include: ["isDeleted"] } },
        onlyDeleted: { where: { isDeleted: true } },

        // ✅ 只看「已審核通過」的排程（給 runner/衝突判斷用）
        approvedOnly() {
          return { where: { reviewStatus: "approved" } };
        },

        // 進行中（含無 endTime 當作尚未結束）
        active() {
          const now = new Date();
          return {
            where: {
              startTime: { [Op.lte]: now },
              [Op.or]: [{ endTime: { [Op.gte]: now } }, { endTime: null }],
            },
          };
        },

        // 即將開始
        upcoming() {
          const now = new Date();
          return {
            where: { startTime: { [Op.gt]: now } },
            order: [["startTime", "ASC"]],
          };
        },

        // 依機台
        byMachine(machineId) {
          return { where: { machineId } };
        },
      },

      indexes: [
        { fields: ["machineId"] },
        { fields: ["startTime"] },
        { fields: ["status"] },
        { fields: ["createdBy"] },
        { fields: ["machineId", "startTime"] },
        { fields: ["userId"] },

        // ✅ 新增：審核查詢常用
        { fields: ["reviewStatus"] },
        { fields: ["approvedBy"] },
      ],

      hooks: {
        // 統一清洗字串 & 狀態正規化 & 自動命名
        beforeValidate(schedule) {
          [
            "scheduleName",
            "testProject",
            "testName",
            "operator",
            "userName",
            "status",
            "reviewStatus",
          ].forEach((k) => {
            if (schedule[k] != null) schedule[k] = String(schedule[k]).trim();
          });

          // ✅ 執行狀態
          if (schedule.status) {
            const ALLOWED = ["pending", "running", "completed", "canceled"];
            const s = String(schedule.status).toLowerCase();
            schedule.status = ALLOWED.includes(s) ? s : "pending";
          }

          // ✅ 審核狀態
          if (schedule.reviewStatus) {
            const ALLOWED = ["pending", "approved", "rejected"];
            const s = String(schedule.reviewStatus).toLowerCase();
            schedule.reviewStatus = ALLOWED.includes(s) ? s : "pending";
          }

          // 自動生成 scheduleName
          if (!schedule.scheduleName && schedule.testName && schedule.startTime) {
            const dateStr = new Date(schedule.startTime)
              .toISOString()
              .slice(0, 10)
              .replace(/-/g, "");
            schedule.scheduleName = `${
              schedule.testProject || "Project"
            }-${schedule.testName}-${dateStr}`;
          }

          // 若沒填 userName，但有 operator，可以自動帶一下（漸進式遷移）
          if (!schedule.userName && schedule.operator) {
            schedule.userName = schedule.operator;
          }
        },
      },

      // ✅ 時間區間驗證（有 endTime 時必須 > startTime）
      validate: {
        dateRange() {
          if (this.endTime && this.startTime && this.endTime <= this.startTime) {
            throw new Error("endTime 必須大於 startTime");
          }
        },
      },
    }
  );

  // 序列化時仍保險隱藏 isDeleted
  MachineSchedule.prototype.toJSON = function () {
    const v = { ...this.get() };
    delete v.isDeleted;
    return v;
  };

  // 🧩 關聯：真正做關聯會在 models/index.js 呼叫
  MachineSchedule.associate = (models) => {
    MachineSchedule.belongsTo(models.Machine, {
      foreignKey: "machineId",
      as: "machine",
    });

    // 建立排程的人（申請人）
    MachineSchedule.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
    });

    // 排程執行者（MachineTestPage / Dashboard 用）
    MachineSchedule.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });

    // ✅ 審核者
    MachineSchedule.belongsTo(models.User, {
      foreignKey: "approvedBy",
      as: "approver",
    });
  };

  return MachineSchedule;
};
