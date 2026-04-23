"use strict";

module.exports = {
  async up(queryInterface) {
    // 1) 先把舊資料 instrument 轉掉（避免 ALTER 失敗）
    await queryInterface.sequelize.query(`
      UPDATE warehouse_items
      SET type='other'
      WHERE type='instrument'
    `);

    // 2) 修改 enum（MySQL 用 raw SQL 最穩）
    await queryInterface.sequelize.query(`
      ALTER TABLE warehouse_items
      MODIFY COLUMN type ENUM('machine','part','tool','fixture','other')
      NOT NULL DEFAULT 'tool'
      COMMENT '品項類別'
    `);
  },

  async down(queryInterface) {
    // 還原 enum（instrument 回來）
    await queryInterface.sequelize.query(`
      ALTER TABLE warehouse_items
      MODIFY COLUMN type ENUM('machine','part','tool','instrument','fixture','other')
      NOT NULL DEFAULT 'tool'
      COMMENT '品項類別'
    `);
  },
};
