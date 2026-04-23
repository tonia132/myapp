// backend/src/migrations/20260113-add-workHours-to-test-cases.cjs
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "test_cases";

    // 避免重複加欄位：先讀表結構
    const desc = await queryInterface.describeTable(table);

    if (!desc.workHours) {
      await queryInterface.addColumn(table, "workHours", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      });
    }
  },

  async down(queryInterface) {
    const table = "test_cases";
    const desc = await queryInterface.describeTable(table);
    if (desc.workHours) {
      await queryInterface.removeColumn(table, "workHours");
    }
  },
};
