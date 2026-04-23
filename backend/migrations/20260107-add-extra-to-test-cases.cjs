// backend/migrations/20260107-add-extra-to-test-cases.cjs
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // ⚠️ 你的表名是 test_cases
    await queryInterface.addColumn("test_cases", "extra", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
      comment: "Template-driven extra fields (JSON)",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("test_cases", "extra");
  },
};
