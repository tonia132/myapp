"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "report_metas";

    const tableExists = async () => {
      try { await queryInterface.describeTable(tableName); return true; }
      catch { return false; }
    };

    // 1) 不存在就直接建 camelCase 統一版
    if (!(await tableExists())) {
      await queryInterface.createTable(tableName, {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },

        productId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },

        reportName: { type: Sequelize.STRING(200), allowNull: true, defaultValue: "Test Report" },
        revision:   { type: Sequelize.STRING(50),  allowNull: true, defaultValue: "0.1" },
        tplVersion: { type: Sequelize.STRING(50),  allowNull: true, defaultValue: "v0006" },

        flagsJson:  { type: Sequelize.JSON, allowNull: true },
        configJson: { type: Sequelize.JSON, allowNull: true },

        createdBy:  { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        updatedBy:  { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },

        projectName: { type: Sequelize.STRING(255), allowNull: true },
        reportNo:    { type: Sequelize.STRING(255), allowNull: true },
        revisionName:{ type: Sequelize.STRING(50),  allowNull: true },
        releasedDate:{ type: Sequelize.DATE,        allowNull: true },

        preparedBy: { type: Sequelize.STRING(255), allowNull: true },
        approvedBy: { type: Sequelize.STRING(255), allowNull: true },

        preparedSignatureFileId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        approvedSignatureFileId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },

        preparedSignatureName: { type: Sequelize.STRING(255), allowNull: true },
        approvedSignatureName: { type: Sequelize.STRING(255), allowNull: true },

        summaryRemark: { type: Sequelize.TEXT, allowNull: true },

        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });

      await queryInterface.addIndex(tableName, ["productId"], { unique: true, name: "uniq_report_metas_productId" });
      return;
    }

    // 2) 已存在：做「對齊 + rename + 補欄位」
    let cols = await queryInterface.describeTable(tableName);

    const renameIfExist = async (from, to) => {
      cols = await queryInterface.describeTable(tableName);
      if (cols[from] && !cols[to]) {
        await queryInterface.renameColumn(tableName, from, to);
      }
    };

    // 2-1) snake_case → camelCase
    await renameIfExist("product_id", "productId");
    await renameIfExist("project_name", "projectName");
    await renameIfExist("report_no", "reportNo");
    await renameIfExist("revision_name", "revisionName");
    await renameIfExist("released_date", "releasedDate");
    await renameIfExist("prepared_by", "preparedBy");
    await renameIfExist("approved_by", "approvedBy");
    await renameIfExist("prepared_signature_fileId", "preparedSignatureFileId");
    await renameIfExist("approved_signature_fileId", "approvedSignatureFileId");
    await renameIfExist("prepared_signature_name", "preparedSignatureName");
    await renameIfExist("approved_signature_name", "approvedSignatureName");
    await renameIfExist("summary_remark", "summaryRemark");
    await renameIfExist("created_at", "createdAt");
    await renameIfExist("updated_at", "updatedAt");

    cols = await queryInterface.describeTable(tableName);

    const ensure = async (name, def) => {
      cols = await queryInterface.describeTable(tableName);
      if (!cols[name]) await queryInterface.addColumn(tableName, name, def);
    };

    // 2-2) v0006 必要欄位補齊
    await ensure("productId", { type: Sequelize.INTEGER.UNSIGNED, allowNull: false }); // 若舊表沒有會補（但通常 rename 已處理）
    await ensure("reportName", { type: Sequelize.STRING(200), allowNull: true, defaultValue: "Test Report" });
    await ensure("revision",   { type: Sequelize.STRING(50),  allowNull: true, defaultValue: "0.1" });
    await ensure("tplVersion", { type: Sequelize.STRING(50),  allowNull: true, defaultValue: "v0006" });
    await ensure("flagsJson",  { type: Sequelize.JSON, allowNull: true });
    await ensure("configJson", { type: Sequelize.JSON, allowNull: true });
    await ensure("createdBy",  { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await ensure("updatedBy",  { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });

    // 2-3) Cover 欄位補齊
    await ensure("projectName", { type: Sequelize.STRING(255), allowNull: true });
    await ensure("reportNo",    { type: Sequelize.STRING(255), allowNull: true });
    await ensure("revisionName",{ type: Sequelize.STRING(50),  allowNull: true });
    await ensure("releasedDate",{ type: Sequelize.DATE,        allowNull: true });
    await ensure("preparedBy",  { type: Sequelize.STRING(255), allowNull: true });
    await ensure("approvedBy",  { type: Sequelize.STRING(255), allowNull: true });
    await ensure("preparedSignatureFileId", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await ensure("approvedSignatureFileId", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await ensure("preparedSignatureName", { type: Sequelize.STRING(255), allowNull: true });
    await ensure("approvedSignatureName", { type: Sequelize.STRING(255), allowNull: true });
    await ensure("summaryRemark", { type: Sequelize.TEXT, allowNull: true });

    // 2-4) timestamps 保底
    await ensure("createdAt", { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") });
    await ensure("updatedAt", { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") });

    // 2-5) unique index 保底（避免你之前卡在 addIndex）
    const [idxRows] = await queryInterface.sequelize.query(
      "SHOW INDEX FROM `report_metas` WHERE Key_name = 'uniq_report_metas_productId';"
    );

    if (!idxRows || idxRows.length === 0) {
      await queryInterface.addIndex(tableName, ["productId"], { unique: true, name: "uniq_report_metas_productId" });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("report_metas");
  },
};
