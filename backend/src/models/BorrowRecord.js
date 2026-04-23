// backend/src/models/BorrowRecord.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const BorrowRecord = sequelize.define(
    "BorrowRecord",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      itemId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "倉庫品項 ID",
      },

      borrowerId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: "借用人 ID",
      },

      quantity: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        comment: "借用數量",
      },

      /**
       * ✅ 流程狀態（不是審核狀態）
       * requested：已送出申請（待審核）
       * borrowed：已核准且已借出（核准/自動核准時才會扣庫存）
       * returned：已歸還
       * canceled：取消（不扣庫存）
       * rejected：審核退回（不扣庫存）
       */
      status: {
        type: DataTypes.ENUM("requested", "borrowed", "returned", "canceled", "rejected"),
        allowNull: false,
        defaultValue: "requested",
        comment: "借用流程狀態",
      },

      /**
       * ✅ 審核狀態（審核中心用）
       * pending：待審
       * approved：通過
       * rejected：退回
       * canceled：取消
       */
      reviewStatus: {
        type: DataTypes.ENUM("pending", "approved", "rejected", "canceled"),
        allowNull: false,
        defaultValue: "pending",
        comment: "審核狀態",
      },

      approvedBy: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: "審核者 Users.id",
      },

      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "審核時間",
      },

      reviewNote: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "審核備註（選填）",
      },

      rejectReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "退回原因（選填/必填由路由控制）",
      },

      purpose: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "用途說明",
      },

      expectedReturnAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "預計歸還時間",
      },

      /**
       * ✅ 申請/借出時間
       * - 申請時可先寫入（requested）
       * - 核准/自動核准時可覆寫成真正借出時間（borrowed）
       */
      borrowedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "申請/借出時間",
      },

      returnedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "實際歸還時間",
      },

      remark: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "備註",
      },
    },
    {
      tableName: "borrow_records",
      timestamps: true,
      comment: "倉庫借用紀錄",

      defaultScope: {
        order: [
          ["borrowedAt", "DESC"],
          ["createdAt", "DESC"],
        ],
      },

      indexes: [
        { fields: ["itemId"] },
        { fields: ["borrowerId"] },
        { fields: ["status"] },
        { fields: ["borrowedAt"] },

        // 審核中心常用
        { fields: ["reviewStatus"] },
        { fields: ["approvedBy"] },
        { fields: ["approvedAt"] },
      ],

      hooks: {
        beforeValidate(row) {
          // trim text fields
          if (row.purpose != null) row.purpose = String(row.purpose).trim();
          if (row.remark != null) row.remark = String(row.remark).trim();
          if (row.reviewNote != null) row.reviewNote = String(row.reviewNote).trim();
          if (row.rejectReason != null) row.rejectReason = String(row.rejectReason).trim();

          // normalize enums
          if (row.status != null) {
            const s = String(row.status).trim().toLowerCase();
            const allowed = ["requested", "borrowed", "returned", "canceled", "rejected"];
            row.status = allowed.includes(s) ? s : "requested";
          }

          if (row.reviewStatus != null) {
            const s = String(row.reviewStatus).trim().toLowerCase();
            const allowed = ["pending", "approved", "rejected", "canceled"];
            row.reviewStatus = allowed.includes(s) ? s : "pending";
          }
        },
      },
    }
  );

  BorrowRecord.associate = (models) => {
    BorrowRecord.belongsTo(models.WarehouseItem, {
      foreignKey: "itemId",
      as: "item",
    });

    BorrowRecord.belongsTo(models.User, {
      foreignKey: "borrowerId",
      as: "borrower",
    });

    // 審核者
    BorrowRecord.belongsTo(models.User, {
      foreignKey: "approvedBy",
      as: "approver",
    });
  };

  return BorrowRecord;
};