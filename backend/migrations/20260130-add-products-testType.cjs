"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("products", "testType", {
      type: Sequelize.STRING(16),
      allowNull: false,
      defaultValue: "x86",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("products", "testType");
  },
};
