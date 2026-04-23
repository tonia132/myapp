"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "products";
    const cols = await queryInterface.describeTable(table);

    // reportMeta (TEXT)
    if (!cols.reportMeta) {
      await queryInterface.addColumn(table, "reportMeta", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    // testPlanDraft (JSON)
    if (!cols.testPlanDraft) {
      await queryInterface.addColumn(table, "testPlanDraft", {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    // testPlanDraftUpdatedBy (INT UNSIGNED)
    if (!cols.testPlanDraftUpdatedBy) {
      await queryInterface.addColumn(table, "testPlanDraftUpdatedBy", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
      await queryInterface.addIndex(table, ["testPlanDraftUpdatedBy"]);
    }

    // testPlanDraftUpdatedAt (DATETIME)
    if (!cols.testPlanDraftUpdatedAt) {
      await queryInterface.addColumn(table, "testPlanDraftUpdatedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await queryInterface.addIndex(table, ["testPlanDraftUpdatedAt"]);
    }
  },

  async down(queryInterface) {
    const table = "products";
    const cols = await queryInterface.describeTable(table);

    // 只做保守 down（存在才刪）
    if (cols.testPlanDraftUpdatedAt) await queryInterface.removeColumn(table, "testPlanDraftUpdatedAt");
    if (cols.testPlanDraftUpdatedBy) await queryInterface.removeColumn(table, "testPlanDraftUpdatedBy");
    if (cols.testPlanDraft) await queryInterface.removeColumn(table, "testPlanDraft");
    if (cols.reportMeta) await queryInterface.removeColumn(table, "reportMeta");
  },
};
