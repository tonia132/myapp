'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'default_test_set_items';

    async function tableExists(name) {
      try {
        await queryInterface.describeTable(name);
        return true;
      } catch {
        return false;
      }
    }

    async function addColumnIfMissing(name, col, def) {
      const cols = await queryInterface.describeTable(name);
      if (!cols[col]) {
        await queryInterface.addColumn(name, col, def);
      }
    }

    function idxFields(idx) {
      const fs = idx?.fields || idx?.columns || [];
      return fs
        .map((f) => (typeof f === 'string' ? f : (f?.attribute || f?.name || '')))
        .filter(Boolean);
    }

    async function hasIndex(tableName, fields) {
      const indexes = await queryInterface.showIndex(tableName).catch(() => []);
      const want = (fields || []).map(String);
      return indexes.some((i) => {
        const got = idxFields(i);
        return got.length === want.length && got.every((x, idx) => x === want[idx]);
      });
    }

    if (!(await tableExists(table))) return;

    await addColumnIfMissing(table, 'testDomain', {
      type: Sequelize.STRING(40),
      allowNull: true,
      comment: '測試維度',
    });

    await addColumnIfMissing(table, 'testTarget', {
      type: Sequelize.STRING(80),
      allowNull: true,
      comment: '測試對象',
    });

    await addColumnIfMissing(table, 'testChapter', {
      type: Sequelize.STRING(160),
      allowNull: true,
      comment: '測試章節',
    });

    await addColumnIfMissing(table, 'extra', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
      comment: '額外欄位，例如 referenceImages / imageNote',
    });

    if (!(await hasIndex(table, ['testSetId', 'orderNo']))) {
      await queryInterface.addIndex(table, ['testSetId', 'orderNo'], {
        name: 'idx_dtsi_testSet_orderNo',
      }).catch(() => {});
    }

    if (!(await hasIndex(table, ['testDomain', 'testTarget', 'testChapter']))) {
      await queryInterface.addIndex(table, ['testDomain', 'testTarget', 'testChapter'], {
        name: 'idx_dtsi_domain_target_chapter',
      }).catch(() => {});
    }
  },

  async down(queryInterface) {
    const table = 'default_test_set_items';

    await queryInterface.removeIndex(table, 'idx_dtsi_domain_target_chapter').catch(() => {});
    await queryInterface.removeIndex(table, 'idx_dtsi_testSet_orderNo').catch(() => {});

    await queryInterface.removeColumn(table, 'extra').catch(() => {});
    await queryInterface.removeColumn(table, 'testChapter').catch(() => {});
    await queryInterface.removeColumn(table, 'testTarget').catch(() => {});
    await queryInterface.removeColumn(table, 'testDomain').catch(() => {});
  },
};