"use strict";

/**
 * 變更內容：
 * 1) 新增欄位：hasPeripheral (BOOLEAN, default false)、os (STRING(16), nullable)
 * 2) status ENUM 改成：normal / partial_damage / disabled_scrap
 * 3) 移除 minQty（警戒值）
 *
 * 舊 status 對應新 status：
 * - normal -> normal
 * - low/out -> normal（因為新規則不再用庫存自動狀態）
 * - retired -> disabled_scrap
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "warehouse_items";
    const cols = await queryInterface.describeTable(tableName);

    // 1) 新增 hasPeripheral
    if (!cols.hasPeripheral) {
      await queryInterface.addColumn(tableName, "hasPeripheral", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "是否有周邊",
      });
    }

    // 2) 新增 os
    if (!cols.os) {
      await queryInterface.addColumn(tableName, "os", {
        type: Sequelize.STRING(16),
        allowNull: true,
        comment: "OS（Win10/Win11）",
      });
    }

    // 3) 先把舊 status 值轉成新白名單內的值（避免改 ENUM 時失敗）
    // - retired -> disabled_scrap
    // - low/out -> normal
    // - 其它不在白名單的也歸 normal
    await queryInterface.sequelize.query(`
      UPDATE \`${tableName}\`
      SET \`status\` =
        CASE
          WHEN LOWER(\`status\`) = 'retired' THEN 'disabled_scrap'
          WHEN LOWER(\`status\`) IN ('low','out') THEN 'normal'
          WHEN LOWER(\`status\`) = 'normal' THEN 'normal'
          ELSE 'normal'
        END
    `);

    // 4) 修改 status ENUM（MySQL 用 ALTER TABLE 最穩）
    await queryInterface.sequelize.query(`
      ALTER TABLE \`${tableName}\`
      MODIFY COLUMN \`status\`
        ENUM('normal','partial_damage','disabled_scrap')
        NOT NULL
        DEFAULT 'normal'
    `);

    // 5) 移除 minQty（警戒值）
    if (cols.minQty) {
      await queryInterface.removeColumn(tableName, "minQty");
    }

    // 6) 補 index（若你 DB 已存在相同 index，addIndex 可能會噴錯，因此用 try/catch 保護）
    try {
      await queryInterface.addIndex(tableName, ["hasPeripheral"]);
    } catch {}
    try {
      await queryInterface.addIndex(tableName, ["os"]);
    } catch {}
    try {
      await queryInterface.addIndex(tableName, ["status"]);
    } catch {}
  },

  async down(queryInterface, Sequelize) {
    const tableName = "warehouse_items";
    const cols = await queryInterface.describeTable(tableName);

    // 1) 先把新 status 轉回舊白名單（避免改回舊 ENUM 時失敗）
    // - disabled_scrap -> retired
    // - partial_damage -> normal（舊沒有這個狀態，回到 normal）
    // - normal -> normal
    await queryInterface.sequelize.query(`
      UPDATE \`${tableName}\`
      SET \`status\` =
        CASE
          WHEN LOWER(\`status\`) = 'disabled_scrap' THEN 'retired'
          WHEN LOWER(\`status\`) = 'partial_damage' THEN 'normal'
          WHEN LOWER(\`status\`) = 'normal' THEN 'normal'
          ELSE 'normal'
        END
    `);

    // 2) 改回舊 status ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE \`${tableName}\`
      MODIFY COLUMN \`status\`
        ENUM('normal','low','out','retired')
        NOT NULL
        DEFAULT 'normal'
    `);

    // 3) 把 minQty 加回來（如果原本存在）
    if (!cols.minQty) {
      await queryInterface.addColumn(tableName, "minQty", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: "庫存警戒值",
      });
      try {
        await queryInterface.addIndex(tableName, ["minQty"]);
      } catch {}
    }

    // 4) 移除新欄位
    if (cols.hasPeripheral) {
      try {
        await queryInterface.removeIndex(tableName, ["hasPeripheral"]);
      } catch {}
      await queryInterface.removeColumn(tableName, "hasPeripheral");
    }

    if (cols.os) {
      try {
        await queryInterface.removeIndex(tableName, ["os"]);
      } catch {}
      await queryInterface.removeColumn(tableName, "os");
    }
  },
};
