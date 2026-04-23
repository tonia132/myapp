"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("products");

    // ✅ testPlanDraft：有就跳過
    if (!table.testPlanDraft) {
      await queryInterface.addColumn("products", "testPlanDraft", {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    // ✅ testPlanDraftUpdatedAt：有就跳過
    if (!table.testPlanDraftUpdatedAt) {
      await queryInterface.addColumn("products", "testPlanDraftUpdatedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("products");

    // ✅ down 也做防呆
    if (table.testPlanDraftUpdatedAt) {
      await queryInterface.removeColumn("products", "testPlanDraftUpdatedAt");
    }
    if (table.testPlanDraft) {
      await queryInterface.removeColumn("products", "testPlanDraft");
    }
  },
};
