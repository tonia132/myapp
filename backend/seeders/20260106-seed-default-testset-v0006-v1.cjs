"use strict";

const path = require("node:path");
const { pathToFileURL } = require("node:url");

const clean = (v) => String(v ?? "").trim();
const toNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

function normalizeItems(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((it, idx) => {
      const code = clean(it?.code);
      if (!code) return null;

      // ✅ 你這份 seedData：workHrs 是「預估工時」
      const estHours = toNum(it?.estHours ?? it?.workHrs ?? it?.estHrs ?? 0, 0);

      return {
        category: clean(it?.category) || null,
        section: clean(it?.section) || null, // 你這份沒有 section，留空即可
        code,
        testCase: clean(it?.testCase || it?.name) || null,
        testProcedure: String(it?.testProcedure ?? "").trim() || null,
        testCriteria: String(it?.testCriteria ?? "").trim() || null,
        estHours,
        isPlanned: it?.isPlanned === false ? false : true,
        orderNo: Number.isFinite(Number(it?.orderNo)) ? Number(it.orderNo) : idx,
      };
    })
    .filter(Boolean);
}

async function pickCreatorId(queryInterface) {
  const [admins] = await queryInterface.sequelize.query(
    "SELECT id FROM users WHERE LOWER(role)='admin' ORDER BY id ASC LIMIT 1"
  );
  if (admins?.[0]?.id) return Number(admins[0].id);

  const [users] = await queryInterface.sequelize.query(
    "SELECT id FROM users ORDER BY id ASC LIMIT 1"
  );
  if (users?.[0]?.id) return Number(users[0].id);

  return 1;
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // backend/src/seedData/defaultTestCases_v6.js
    const seedFile = path.resolve(__dirname, "..", "src", "seedData", "defaultTestCases_v6.js");
    const mod = await import(pathToFileURL(seedFile).href);

    const rawItems = mod?.default || [];
    const items = normalizeItems(rawItems);

    const name = "x86 Preset v0006 V1";
    const description = "Built-in preset (v0006 V1)";
    const createdBy = await pickCreatorId(queryInterface);

    // 是否已存在
    const [found] = await queryInterface.sequelize.query(
      "SELECT id FROM default_test_sets WHERE name = ? LIMIT 1",
      { replacements: [name] }
    );

    let setId = found?.[0]?.id ? Number(found[0].id) : null;

    const meta = {
      templateVersion: "0006",
      preset: "V1",
      source: "src/seedData/defaultTestCases_v6.js",
      seededAt: now.toISOString(),
      count: items.length,
    };

    // ✅ DefaultTestSet.testCases：存乾淨版（用 estHours，不存 result/workHrs/remark）
    const testCasesJson = items.map((it) => ({
      category: it.category,
      section: it.section,
      code: it.code,
      testCase: it.testCase,
      testProcedure: it.testProcedure,
      testCriteria: it.testCriteria,
      estHours: it.estHours,
      isPlanned: it.isPlanned,
      orderNo: it.orderNo,
    }));

    if (!setId) {
      await queryInterface.bulkInsert("default_test_sets", [
        {
          name,
          description,
          testCases: JSON.stringify(testCasesJson), // ✅ 你 DB 欄位 allowNull:false，必帶
          createdBy,
          fromProductId: null,
          meta: JSON.stringify(meta),
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const [newRows] = await queryInterface.sequelize.query(
        "SELECT id FROM default_test_sets WHERE name = ? ORDER BY id DESC LIMIT 1",
        { replacements: [name] }
      );
      setId = Number(newRows[0].id);
    } else {
      // 更新 + 先清 items（避免 uq(testSetId,code)）
      await queryInterface.bulkUpdate(
        "default_test_sets",
        {
          description,
          testCases: JSON.stringify(testCasesJson),
          meta: JSON.stringify(meta),
          fromProductId: null,
          updatedAt: now,
        },
        { id: setId }
      );

      await queryInterface.bulkDelete("default_test_set_items", { testSetId: setId });
    }

    if (items.length) {
      const rowsToInsert = items.map((it) => ({
        testSetId: setId,
        category: it.category,
        section: it.section,
        code: it.code,
        testCase: it.testCase,
        testProcedure: it.testProcedure,
        testCriteria: it.testCriteria,
        estHours: it.estHours, // ✅ workHrs → estHours
        isPlanned: it.isPlanned,
        orderNo: it.orderNo,

        createdAt: now,
        updatedAt: now,
      }));

      await queryInterface.bulkInsert("default_test_set_items", rowsToInsert);
    }

    console.log(`✅ Seeded DefaultTestSet: ${name} (#${setId}), items=${items.length}`);
  },

  async down(queryInterface) {
    const name = "x86 Preset v0006 V1";
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM default_test_sets WHERE name = ? LIMIT 1",
      { replacements: [name] }
    );

    const setId = rows?.[0]?.id ? Number(rows[0].id) : null;
    if (setId) {
      await queryInterface.bulkDelete("default_test_set_items", { testSetId: setId });
      await queryInterface.bulkDelete("default_test_sets", { id: setId });
    }
  },
};
