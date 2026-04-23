'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const itemsTable = 'default_test_set_items';

    async function tableExists(table) {
      try {
        await queryInterface.describeTable(table);
        return true;
      } catch {
        return false;
      }
    }

    function idxFields(idx) {
      // mysql: showIndex 回傳 fields: [{ attribute: 'col' }, ...]
      const fs = idx?.fields || idx?.columns || [];
      return fs
        .map((f) => (typeof f === 'string' ? f : (f?.attribute || f?.name || '')))
        .filter(Boolean);
    }

    async function listIndexes(table) {
      const idx = await queryInterface.showIndex(table).catch(() => []);
      return Array.isArray(idx) ? idx : [];
    }

    function hasIndexByName(indexes, name) {
      return indexes.some((i) => String(i?.name || '') === String(name));
    }

    function hasIndexStartingWith(indexes, firstCol) {
      const col = String(firstCol || '');
      return indexes.some((i) => {
        const fs = idxFields(i);
        return fs.length > 0 && fs[0] === col;
      });
    }

    function hasExactIndex(indexes, cols, unique = null) {
      const want = (cols || []).map(String);
      return indexes.some((i) => {
        const fs = idxFields(i);
        const sameCols = fs.length === want.length && fs.every((c, k) => c === want[k]);
        if (!sameCols) return false;
        if (unique === null) return true;
        return Boolean(i?.unique) === Boolean(unique);
      });
    }

    async function addIndexSafe(table, fields, name, options = {}) {
      const indexes = await listIndexes(table);
      if (name && hasIndexByName(indexes, name)) return;
      if (hasExactIndex(indexes, fields, options?.unique ?? null)) return;
      await queryInterface.addIndex(table, fields, { name, ...options });
    }

    // 1) 建表（不存在才建）
    const exists = await tableExists(itemsTable);
    if (!exists) {
      await queryInterface.createTable(itemsTable, {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },

        testSetId: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'default_test_sets', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },

        category: { type: Sequelize.STRING(40), allowNull: true },
        section: { type: Sequelize.STRING(120), allowNull: true },

        code: { type: Sequelize.STRING(120), allowNull: false },
        testCase: { type: Sequelize.STRING(500), allowNull: true },

        testProcedure: { type: Sequelize.TEXT, allowNull: true },
        testCriteria: { type: Sequelize.TEXT, allowNull: true },

        estHours: { type: Sequelize.DECIMAL(6, 1), allowNull: true, defaultValue: 0 },
        isPlanned: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },

        orderNo: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true, defaultValue: 0 },

        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE },
      });
    }

    // 2) 既有表：保險檢查欄位是否存在（避免你某次舊版欄位叫 defaultTestSetId）
    const cols = await queryInterface.describeTable(itemsTable);
    if (!cols.testSetId && cols.defaultTestSetId) {
      // 你若歷史上用過 defaultTestSetId，這裡幫你對齊成 testSetId
      await queryInterface.renameColumn(itemsTable, 'defaultTestSetId', 'testSetId');
    } else if (!cols.testSetId) {
      // 真的沒有，就補欄位 + FK
      await queryInterface.addColumn(itemsTable, 'testSetId', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'default_test_sets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

    // 3) 索引：先抓現況
    const indexes = await listIndexes(itemsTable);

    // ✅ uq (testSetId, code) —— 不管有沒有名字，都用「欄位」判斷避免重複
    if (!hasExactIndex(indexes, ['testSetId', 'code'], true)) {
      await addIndexSafe(itemsTable, ['testSetId', 'code'], 'uq_dtsi_set_code', { unique: true });
    }

    // ✅ idx_dtsi_testSetId：若已經有任何 index 以 testSetId 開頭（例如 uq），就不用再加
    if (!hasIndexStartingWith(indexes, 'testSetId')) {
      await addIndexSafe(itemsTable, ['testSetId'], 'idx_dtsi_testSetId');
    }

    // ✅ idx_dtsi_code：若已經有任何 index 以 code 開頭才算「已覆蓋」
    if (!hasIndexStartingWith(indexes, 'code')) {
      await addIndexSafe(itemsTable, ['code'], 'idx_dtsi_code');
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('default_test_set_items');
  },
};
