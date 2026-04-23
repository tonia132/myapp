"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("products", "testPlanDraft", {
      type: Sequelize.JSON,
      allowNull: true,
      comment: "Autosave draft for ProductTest page",
    });

    await queryInterface.addColumn("products", "testPlanDraftUpdatedBy", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "User ID who updated draft",
    });

    await queryInterface.addColumn("products", "testPlanDraftUpdatedAt", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Draft updated time",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("products", "testPlanDraft");
    await queryInterface.removeColumn("products", "testPlanDraftUpdatedBy");
    await queryInterface.removeColumn("products", "testPlanDraftUpdatedAt");
  },
};
