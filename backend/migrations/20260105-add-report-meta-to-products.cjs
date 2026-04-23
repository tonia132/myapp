"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "products";

    // 加一個 TEXT 存 JSON（相容 MySQL）
    await queryInterface.addColumn(table, "reportMeta", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "JSON string for test report cover meta (v0006 etc.)",
    });
  },

  async down(queryInterface) {
    const table = "products";
    await queryInterface.removeColumn(table, "reportMeta");
  },
};
