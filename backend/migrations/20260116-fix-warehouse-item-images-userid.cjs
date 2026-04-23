'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const table = 'warehouse_item_images';

    let desc;
    try {
      desc = await qi.describeTable(table);
    } catch (e) {
      // 沒有這張表就跳過
      return;
    }

    // ✅ 若存在 userId，就放寬成 NULL（避免新增品項時 bulkCreate 爆掉）
    if (desc.userId) {
      await qi.changeColumn(table, 'userId', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      });
    }

    // （可選）如果你其實想保留建立者欄位，建議改用 createdBy
    // 但這需要你同時改 model + 寫入 bulkCreate payload。
  },

  async down(queryInterface, Sequelize) {
    // down 不建議改回 NOT NULL，避免回滾後又立刻壞掉
    return;
  }
};
