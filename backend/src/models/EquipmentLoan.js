// backend/src/models/EquipmentLoan.js
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const EquipmentLoan = sequelize.define(
    'EquipmentLoan',
    {
      equipmentId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      quantity: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1
      },
      borrowedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      expectedReturnAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      returnedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },

      /**
       * ✅ status：保留你原本「借用流程狀態」
       * 例：requested / borrowed / returned / canceled ...
       * 你原本 defaultValue: 'borrowed' 不改也可以（避免影響既有流程）
       */
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'borrowed'
      },

      remark: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      /* =========================================================
         ✅ 新增：審核欄位（給審核中心用）
         為了不影響既有資料，預設值用 'approved'
         （舊資料會視為已通過；真正申請時由 API 設成 pending）
      ========================================================= */
      reviewStatus: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'approved', // ✅ 避免舊資料全部變 pending
        comment: '審核狀態 (pending / approved / rejected)'
      },
      approvedBy: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: '審核者 ID（Users.id）'
      },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '審核時間'
      },
      reviewNote: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '批准備註（選填）'
      },
      rejectReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '退回原因（必填）'
      }
    },
    {
      tableName: 'equipment_loans',
      timestamps: true,
      indexes: [
        { fields: ['equipmentId'] },
        { fields: ['userId'] },
        { fields: ['status'] },
        { fields: ['reviewStatus'] }, // ✅ 新增
        { fields: ['approvedBy'] }    // ✅ 新增
      ],
      hooks: {
        beforeValidate(row) {
          if (row.remark) row.remark = String(row.remark).trim();
          if (row.reviewNote) row.reviewNote = String(row.reviewNote).trim();
          if (row.rejectReason) row.rejectReason = String(row.rejectReason).trim();
          if (row.reviewStatus) row.reviewStatus = String(row.reviewStatus).trim().toLowerCase();
          if (row.status) row.status = String(row.status).trim().toLowerCase();
        }
      }
    }
  );

  EquipmentLoan.associate = (models) => {
    EquipmentLoan.belongsTo(models.Equipment, {
      foreignKey: 'equipmentId',
      as: 'equipment'
    });

    // 申請人
    EquipmentLoan.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // ✅ 審核者
    EquipmentLoan.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });
  };

  return EquipmentLoan;
};
