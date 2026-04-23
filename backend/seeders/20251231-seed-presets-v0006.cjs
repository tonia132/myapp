"use strict";

const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

async function tableExists(queryInterface, table) {
  try {
    await queryInterface.describeTable(table);
    return true;
  } catch {
    return false;
  }
}

function pickExistingCols(desc, obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (desc[k] !== undefined && v !== undefined) out[k] = v;
  }
  return out;
}

async function loadPresetItems() {
  // ✅ 你把 preset 檔案放哪都行，下面會依序嘗試
  const candidates = [
    path.resolve(__dirname, "./defaultTestCases_v6.js"),
    path.resolve(__dirname, "./presets/defaultTestCases_v6.js"),
    path.resolve(__dirname, "../src/presets/defaultTestCases_v6.js"),
  ];

  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const mod = await import(pathToFileURL(p).href);
    const items = mod?.default || mod?.items || mod?.testCases || [];
    return Array.isArray(items) ? items : [];
  }

  // 沒找到就回空陣列（但仍會寫入 testCases:'[]' 避免 NOT NULL 失敗）
  return [];
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();

      const setsTable = "default_test_sets";
      const itemsTable = "default_test_set_items";

      const setsDesc = await queryInterface.describeTable(setsTable);
      const hasItemsTable = await tableExists(queryInterface, itemsTable);
      const itemsDesc = hasItemsTable ? await queryInterface.describeTable(itemsTable) : null;

      const presetName = "x86 Preset v0006 V1";
      const presetItems = await loadPresetItems();

      // ✅ testCases 欄位一定要寫（NOT NULL）
      const testCasesJson = JSON.stringify(presetItems);

      // 先找 set 是否已存在
      const [found] = await queryInterface.sequelize.query(
        `SELECT id FROM ${setsTable} WHERE name = ? LIMIT 1`,
        { replacements: [presetName], transaction: t }
      );
      const existedId = found?.[0]?.id ? Number(found[0].id) : null;

      const baseSet = {
        name: presetName,
        description: "Built-in preset",
        createdBy: 3,
        fromProductId: null,
        testCases: testCasesJson, // ✅ 關鍵
        createdAt: now,
        updatedAt: now,
      };

      if (!existedId) {
        await queryInterface.bulkInsert(
          setsTable,
          [pickExistingCols(setsDesc, baseSet)],
          { transaction: t }
        );
      } else {
        const patch = { ...baseSet };
        delete patch.createdAt; // update 不動 createdAt
        await queryInterface.bulkUpdate(
          setsTable,
          pickExistingCols(setsDesc, patch),
          { id: existedId },
          { transaction: t }
        );
      }

      // 取回 setId（insert 或 update 後都保險再查一次）
      const [again] = await queryInterface.sequelize.query(
        `SELECT id FROM ${setsTable} WHERE name = ? LIMIT 1`,
        { replacements: [presetName], transaction: t }
      );
      const setId = Number(again?.[0]?.id || 0);
      if (!setId) throw new Error("Failed to get default_test_sets.id");

      // ✅ 若有 default_test_set_items，就同步塞一份 items（方便 /import-from-set 用）
      if (hasItemsTable && itemsDesc) {
        // 先清掉舊 items（避免 unique 撞）
        await queryInterface.bulkDelete(itemsTable, { testSetId: setId }, { transaction: t });

        const rows = presetItems.map((it, idx) => {
          const code = String(it?.code || "").trim() || `TC-${String(idx + 1).padStart(4, "0")}`;
          const row = {
            testSetId: setId,
            category: it?.category ?? null,
            section: it?.section ?? null,
            code,
            testCase: it?.testCase ?? null,
            testProcedure: it?.testProcedure ?? null,
            testCriteria: it?.testCriteria ?? null,
            estHours: it?.estHours ?? 0,
            isPlanned: typeof it?.isPlanned === "undefined" ? true : !!it.isPlanned,
            orderNo: idx + 1,
            createdAt: now,
            updatedAt: now,
          };
          return pickExistingCols(itemsDesc, row);
        });

        if (rows.length) {
          await queryInterface.bulkInsert(itemsTable, rows, { transaction: t });
        }
      }

      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },

  async down(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const setsTable = "default_test_sets";
      const itemsTable = "default_test_set_items";
      const presetName = "x86 Preset v0006 V1";

      const [found] = await queryInterface.sequelize.query(
        `SELECT id FROM ${setsTable} WHERE name = ? LIMIT 1`,
        { replacements: [presetName], transaction: t }
      );
      const id = found?.[0]?.id ? Number(found[0].id) : null;

      if (id) {
        // 先刪 items
        try {
          await queryInterface.bulkDelete(itemsTable, { testSetId: id }, { transaction: t });
        } catch {}
        // 再刪 set
        await queryInterface.bulkDelete(setsTable, { id }, { transaction: t });
      }

      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
};
