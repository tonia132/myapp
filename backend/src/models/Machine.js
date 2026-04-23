// backend/src/models/Machine.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Machine = sequelize.define(
    "Machine",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      // ✅ 機台名稱（必要）
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "機台名稱",
      },

      // 型號（可選）
      model: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "機台型號",
      },

      // 擺放地點（可選）
      location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "擺放地點",
      },

      // 說明（可選）
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "機台描述",
      },

      // 建立者
      createdBy: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "建立者 ID",
      },

      // ✅ 狀態統一小寫並限白名單
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "idle",
        comment: "狀態 (idle / running / maintenance / error)",
        validate: {
          isIn: {
            args: [["idle", "running", "maintenance", "error"]],
            msg: "status 必須為 idle / running / maintenance / error 其中之一",
          },
        },
      },

      imageUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "圖片路徑",
      },

      // ✅ 機台卡片預覽圖（從檔案中心選，files.id）
      previewFileId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: "預覽圖檔案 ID（files.id）",
      },

      /* =========================================================
         ✅ Telemetry：外部即時資料來源（例如 GF9700）
         - telemetryType: 來源類型，例如 'gf9700'
         - telemetryCode: 來源機台代碼，例如 '01'
      ========================================================= */
      telemetryType: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: "Telemetry 來源類型 (ex: gf9700)",
      },
      telemetryCode: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: "Telemetry 來源機台代碼 (ex: 01)",
      },

      /* =========================================================
         ✅ Setpoint：目標溫/濕度（用於「調整機台溫度」）
      ========================================================= */

      // 目標溫度（°C）
      targetTemp: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        comment: "目標溫度 setpoint (°C)",
        validate: {
          isValidTemp(v) {
            if (v == null || v === "") return;
            const n = Number(v);
            if (!Number.isFinite(n)) throw new Error("targetTemp 必須為數字");
            if (n < -80 || n > 250) throw new Error("targetTemp 超出範圍 (-80 ~ 250°C)");
          },
        },
      },

      // 目標濕度（%）
      targetHumidity: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: "目標濕度 setpoint (%)",
        validate: {
          isValidHumidity(v) {
            if (v == null || v === "") return;
            const n = Number(v);
            if (!Number.isFinite(n)) throw new Error("targetHumidity 必須為數字");
            if (n < 0 || n > 100) throw new Error("targetHumidity 超出範圍 (0 ~ 100%)");
          },
        },
      },

      // 最後一次設定 setpoint 的時間
      lastSetpointAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "最後一次更新 setpoint 的時間",
      },

      // 軟刪除旗標
      isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "軟刪除標記",
      },
    },
    {
      tableName: "machines",
      timestamps: true,
      underscored: false,
      comment: "機台資料表",

      defaultScope: {
        where: { isDeleted: false },
        attributes: { exclude: ["isDeleted"] },
        order: [["createdAt", "DESC"]],
      },
      scopes: {
        withDeleted: { attributes: { include: ["isDeleted"] } },
        onlyDeleted: { where: { isDeleted: true } },
      },

      indexes: [
        { fields: ["createdBy"] },
        { fields: ["status"] },
        { fields: ["name"] },
        { fields: ["lastSetpointAt"] },
        { fields: ["previewFileId"] },

        // ✅ Telemetry 查詢用（bridge 會用 where telemetryType+telemetryCode 找 machine）
        { fields: ["telemetryType", "telemetryCode"] },
      ],

      hooks: {
        beforeValidate(row) {
          if (row.name) row.name = String(row.name).trim();
          if (row.model) row.model = String(row.model).trim();
          if (row.location) row.location = String(row.location).trim();

          if (row.description) row.description = String(row.description);

          // ✅ Telemetry trim / normalize
          if (row.telemetryType != null && row.telemetryType !== "") {
            row.telemetryType = String(row.telemetryType).trim().toLowerCase();
          } else if (row.telemetryType === "") {
            row.telemetryType = null;
          }

          if (row.telemetryCode != null && row.telemetryCode !== "") {
            // code 常見需要 01 這種格式，你也可以自己決定是否補 0
            row.telemetryCode = String(row.telemetryCode).trim();
          } else if (row.telemetryCode === "") {
            row.telemetryCode = null;
          }

          if (row.status) {
            const s = String(row.status).trim().toLowerCase();
            const ALLOWED = ["idle", "running", "maintenance", "error"];
            row.status = ALLOWED.includes(s) ? s : "idle";
          }

          if (row.targetTemp === "") row.targetTemp = null;
          if (row.targetHumidity === "") row.targetHumidity = null;
          if (row.previewFileId === "") row.previewFileId = null;
        },
      },
    }
  );

  Machine.prototype.toJSON = function () {
    const v = { ...this.get() };
    delete v.isDeleted;
    return v;
  };

  Machine.associate = (models) => {
    Machine.belongsTo(models.User, { foreignKey: "createdBy", as: "creator" });
    Machine.hasMany(models.MachineSchedule, { foreignKey: "machineId", as: "schedules" });
    Machine.hasMany(models.MachineTest, { foreignKey: "machineId", as: "tests" });

    // ✅ 預覽圖（files.id）
    if (models.File) {
      Machine.belongsTo(models.File, {
        foreignKey: "previewFileId",
        as: "previewFile",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }
  };

  return Machine;
};
