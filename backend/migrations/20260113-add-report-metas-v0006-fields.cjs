"use strict";

/**
 * ✅ 修正：ReportMeta model 有 projectName 等欄位，但 DB 表還沒加
 * 這支 migration 會「只新增缺少的欄位」，不會破壞既有資料。
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = "report_metas";

    // 如果你專案 migration 可能先前還沒 create report_metas，這裡會直接 throw
    const desc = await queryInterface.describeTable(table);

    const addIfMissing = async (col, def) => {
      if (!desc[col]) {
        await queryInterface.addColumn(table, col, def);
      }
    };

    await addIfMissing("projectName", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await addIfMissing("reportNo", {
      type: Sequelize.STRING(64),
      allowNull: true,
    });

    await addIfMissing("revisionName", {
      type: Sequelize.STRING(64),
      allowNull: true,
    });

    await addIfMissing("releasedDate", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await addIfMissing("preparedBy", {
      type: Sequelize.STRING(128),
      allowNull: true,
    });

    await addIfMissing("approvedBy", {
      type: Sequelize.STRING(128),
      allowNull: true,
    });

    await addIfMissing("preparedSignatureFileId", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await addIfMissing("approvedSignatureFileId", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await addIfMissing("preparedSignatureName", {
      type: Sequelize.STRING(128),
      allowNull: true,
    });

    await addIfMissing("approvedSignatureName", {
      type: Sequelize.STRING(128),
      allowNull: true,
    });

    await addIfMissing("summaryRemark", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    const table = "report_metas";

    // 保守：只 drop 這次新增的欄位（若欄位不存在會噴錯，所以先 try）
    const drop = async (col) => {
      try {
        await queryInterface.removeColumn(table, col);
      } catch {}
    };

    await drop("projectName");
    await drop("reportNo");
    await drop("revisionName");
    await drop("releasedDate");
    await drop("preparedBy");
    await drop("approvedBy");
    await drop("preparedSignatureFileId");
    await drop("approvedSignatureFileId");
    await drop("preparedSignatureName");
    await drop("approvedSignatureName");
    await drop("summaryRemark");
  },
};
