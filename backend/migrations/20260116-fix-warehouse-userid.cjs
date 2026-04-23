'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const table = 'warehouse_items';

    const desc = await qi.describeTable(table);

    const hasUserId = !!desc.userId;
    const hasCreatedBy = !!desc.createdBy;

    // 情境 A：同時存在 userId & createdBy（最常見：舊欄位沒刪掉）
    if (hasUserId && hasCreatedBy) {
      // 先把舊資料補齊：createdBy 若空就用 userId 補
      await qi.sequelize.query(`
        UPDATE ${table}
        SET createdBy = COALESCE(createdBy, userId)
        WHERE createdBy IS NULL OR createdBy = 0
      `);

      // 把 userId 改成可為 NULL（避免新增時沒帶 userId 就爆）
      await qi.changeColumn(table, 'userId', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      });

      return;
    }

    // 情境 B：只有 userId（舊版欄位），沒有 createdBy -> 直接改名成 createdBy
    if (hasUserId && !hasCreatedBy) {
      await qi.renameColumn(table, 'userId', 'createdBy');
      await qi.changeColumn(table, 'createdBy', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      });
      return;
    }

    // 情境 C：只有 createdBy（新版），沒有 userId -> 不用做事
    if (!hasUserId && hasCreatedBy) return;

    // 情境 D：兩個都沒有（極少）-> 補 createdBy 欄位
    await qi.addColumn(table, 'createdBy', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1, // 你也可以改成 admin id
    });
  },

  async down(queryInterface, Sequelize) {
    const qi = queryInterface;
    const table = 'warehouse_items';

    const desc = await qi.describeTable(table);
    const hasUserId = !!desc.userId;
    const hasCreatedBy = !!desc.createdBy;

    // down 盡量不破壞資料：如果只有 createdBy，補回 userId(允許 null)
    if (!hasUserId && hasCreatedBy) {
      await qi.addColumn(table, 'userId', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      });

      await qi.sequelize.query(`
        UPDATE ${table}
        SET userId = createdBy
        WHERE userId IS NULL
      `);

      return;
    }

    // 如果兩個都有，把 userId 改回 NOT NULL（但這會讓你又遇到同樣錯）
    // 所以 down 這裡不強制改回 NOT NULL，避免回滾後直接壞掉。
    return;
  }
};
