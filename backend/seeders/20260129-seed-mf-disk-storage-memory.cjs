/* eslint-disable no-console */
/**
 * MF DISK Storage Set + Memory Set
 * Source: TEAMGROUP SSD / Memory Test Report (v0006, .xlsm)
 * Generated: 2026-01-29 03:46:20
 */

'use strict';

const { QueryTypes } = require('sequelize');

const TEST_CASES = [
  {
    code: "DI_001",
    title: "To check device can be installed well with system.",
    procedure: `1. Prepare system which DUT will work in. (List system name in Remark)
2. Install DUT into slot or the location designed for DUT, mount and tighten the screws if needed.`,
    criteria: `DUT should not have any conflict with placement of components on the board and screws (if needed) should be mounted well.`,
    sourceSheet: "DA (SSD+MEM)",
  },
  {
    code: "OSI_001",
    title: "To confirm Microsoft OS can be installed on system without problem.",
    procedure: `1. Connect storage device and USB disk to system. (USB disk stores OS installation image)
2. Power on system and set USB disk as first bootable device.
3. Install Microsoft OS from USB disk to storage device.`,
    criteria: `Microsoft OS should be installed on storage device without any errors and BSOD found, and it should not hang during installation.`,
    sourceSheet: "SF",
  },
  {
    code: "SDI_001",
    title: "Use HWINFO64 to check storage's information supported by system.",
    procedure: `1. Install Microsoft OS, then install HWINFO64 into OS.
2. Execute HWINFO64, check "System Summary" to find information of storage.
3. Compare storage's spec., system spec. and running status. (List speed & bandwidth in below table)`,
    criteria: `The running status should be the same as storage's spec. if it is system's limitation, describe it in "Remark" field. Otherwise, "Fail" should be given to this test.`,
    sourceSheet: "SF",
  },
  {
    code: "CDM_001",
    title: "To get benchmark of read and write speed of storage device.",
    procedure: `1. Install Microsoft OS and CrystalDiskMark into storage device.
2. Execute CrystalDiskMark to get read & write access speed.
3. Capture picture of read & write result and attached it to this report.`,
    criteria: `1. CrystalDiskMark should run well and can come out result for each testing item.
2. Read & Write rate should not be lower than 80% of rates listed in device spec. if system supports the rate.`,
    sourceSheet: "PF",
  },
  {
    code: "RBC_001",
    title: "Cycling test on system reboot to confirm the stability of accessing storage device.",
    procedure: `1. Install PassMark Rebooter tool on Windows OS which installed on DUT.
2. Boot into OS.
3. Execute reboot test 100 times.`,
    criteria: `No error found during test.`,
    sourceSheet: "ST",
  },
  {
    code: "SST_001",
    title: "To do stress test on storage and get storage's operating temperature.",
    procedure: `1. Execute PassMark BurnInTest with 100% load of storage under OS for 4 hours.
2. Execute HWINFO64 to record temperature of storage.`,
    criteria: `Stress test should not find error during test and average operating temperature of storage should be lower than maximum supported temperature of storage.`,
    sourceSheet: "RE",
  },
  {
    code: "SSTL_001",
    title: "To do stress test on storage and get storage's operating temperature under supported low temperature of system.",
    procedure: `1. Put system into chamber, configure chamber's temperature to lowest temperature that system supports and wait for temperature to be stable.
2. Boot system into OS, execute PassMark BurnInTest with 100% load of storage for 4 hours.
3. Execute HWINFO64 to record temperature of storage.`,
    criteria: `Stress test should not find error during test and average operating temperature of storage should be lower than maximum supported temperature of storage.`,
    sourceSheet: "RE",
  },
  {
    code: "SSTH_001",
    title: "To do stress test on storage and get storage's operating temperature under supported high temperature of system.",
    procedure: `1. Execute PassMark BurnInTest with 100% load of storage under OS for 4 hours.
2. Execute HWINFO64 to record temperature of storage.`,
    criteria: `Stress test should not find error during test and average operating temperature of storage should be lower than maximum supported temperature of storage.`,
    sourceSheet: "RE",
  },
  {
    code: "MI_001",
    title: "To check memory's information recognized and supported by system.",
    procedure: `1. Execute HWINFO64 after OS booting, check "System Summary" to find information of memory.
2. Compare memory's spec. and running status.`,
    criteria: `The running status should be the same as memory's spec. if it is system's limitation, describe it in "System" field. Otherwise, "Fail" result is confirmed.`,
    sourceSheet: "MF",
  },
  {
    code: "MPT_001",
    title: "To read/write pattern from/to memory for confirming memory's functionality.",
    procedure: `1. Prepare a bootable USB disk including MemTest86+ program.
2. Configure USB as the first boot device.
3. Power on system, boot into USB disk, then execute MemTest86+.
4. Continue executing MemTest86+ testing 10 cycles.`,
    criteria: `System should be alive and MemTest86+ shows no error found.`,
    sourceSheet: "MF",
  },
  {
    code: "MST_001",
    title: "To do stress test on memory and get memory's operating temperature.",
    procedure: `1. Execute PassMark BurnInTest with 100% load of memory under OS for 4 hours.
2. Execute HWINFO64 to record temperature of memory.`,
    criteria: `Stress test should not find error during test and average operating temperature of memory should be lower than maximum supported temperature of memory.`,
    sourceSheet: "RE",
  },
  {
    code: "MSTL_001",
    title: "To do stress test on memory and get memory's operating temperature under supported low temperature of system.",
    procedure: `1. Put system into chamber, configure chamber's temperature to lowest temperature that system supports and wait for temperature to be stable.
2. Boot system into OS, execute PassMark BurnInTest with 100% load of memory for 4 hours.
3. Execute HWINFO64 to record temperature of memory.`,
    criteria: `Stress test should not find error during test and average operating temperature of memory should be lower than maximum supported temperature of memory.`,
    sourceSheet: "RE",
  },
  {
    code: "MSTH_001",
    title: "To do stress test on memory and get memory's operating temperature under supported high temperature of system.",
    procedure: `1. Execute PassMark BurnInTest with 100% load of memory under OS for 4 hours.
2. Execute HWINFO64 to record temperature of memory.`,
    criteria: `Stress test should not find error during test and average operating temperature of memory should be lower than maximum supported temperature of memory.`,
    sourceSheet: "RE",
  }
];

const DEFAULT_TEST_SETS = [
  {
    name: "MF DISK Storage Set",
    description: `Imported from TEAMGROUP SSD Test Report (v0006): sheets DA/SF/PF/ST/RE`,
    codes: ["DI_001", "OSI_001", "SDI_001", "CDM_001", "RBC_001", "SST_001", "SSTL_001", "SSTH_001"],
  },
  {
    name: "Memory Set",
    description: `Imported from TEAMGROUP Memory Test Report (v0006): sheets DA/MF/RE`,
    codes: ["DI_001", "MI_001", "MPT_001", "MST_001", "MSTL_001", "MSTH_001"],
  }
];

function firstExisting(cols, candidates) {
  for (const c of candidates) {
    if (cols.has(c)) return c;
  }
  return null;
}

function findPrimaryKey(describe) {
  for (const [col, def] of Object.entries(describe)) {
    if (def && def.primaryKey) return col;
  }
  return 'id';
}

async function resolveTable(queryInterface, candidates) {
  for (const t of candidates) {
    try {
      await queryInterface.describeTable(t);
      return t;
    } catch (e) {
      // ignore
    }
  }
  throw new Error(`Unable to resolve table name. Tried: ${candidates.join(', ')}`);
}

function applySoftDeleteDefaults(row, cols, isDeletedCol, deletedAtCol) {
  if (isDeletedCol && row[isDeletedCol] === undefined) row[isDeletedCol] = false;
  if (deletedAtCol && row[deletedAtCol] === undefined) row[deletedAtCol] = null;
  return row;
}

function applyTimestamps(row, createdAtCol, updatedAtCol, now) {
  if (createdAtCol && row[createdAtCol] === undefined) row[createdAtCol] = now;
  if (updatedAtCol) row[updatedAtCol] = now;
  return row;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // --- Resolve tables (support both snake_case and legacy naming) ---
      const tables = {
        testCases: await resolveTable(queryInterface, ['test_cases', 'TestCases', 'testCases']),
        defaultSets: await resolveTable(queryInterface, ['default_test_sets', 'DefaultTestSets', 'defaultTestSets']),
        defaultItems: await resolveTable(queryInterface, ['default_test_set_items', 'DefaultTestSetItems', 'defaultTestSetItems']),
      };

      const tcDesc = await queryInterface.describeTable(tables.testCases);
      const setDesc = await queryInterface.describeTable(tables.defaultSets);
      const itemDesc = await queryInterface.describeTable(tables.defaultItems);

      const tcCols = new Set(Object.keys(tcDesc));
      const setCols = new Set(Object.keys(setDesc));
      const itemCols = new Set(Object.keys(itemDesc));

      const tcPK = findPrimaryKey(tcDesc);
      const setPK = findPrimaryKey(setDesc);

      // --- Column mapping (auto-detect to match your existing DB/Sequelize fields) ---
      const tcColCode = firstExisting(tcCols, ['code', 'caseCode', 'tcCode']);
      const tcColTitle = firstExisting(tcCols, ['title', 'name', 'testName', 'caseName', 'item']);
      const tcColProcedure = firstExisting(tcCols, ['procedure', 'testProcedure', 'steps', 'testSteps', 'method', 'content', 'description', 'desc']);
      const tcColCriteria = firstExisting(tcCols, ['criteria', 'testCriteria', 'expectedResult', 'expected', 'passCriteria', 'acceptanceCriteria']);

      const tcColCreatedAt = firstExisting(tcCols, ['createdAt', 'created_at']);
      const tcColUpdatedAt = firstExisting(tcCols, ['updatedAt', 'updated_at']);
      const tcColIsDeleted = firstExisting(tcCols, ['isDeleted', 'is_deleted']);
      const tcColDeletedAt = firstExisting(tcCols, ['deletedAt', 'deleted_at']);

      if (!tcColCode) {
        throw new Error(`TestCase code column not found. Existing columns: ${[...tcCols].join(', ')}`);
      }

      const setColName = firstExisting(setCols, ['name', 'setName', 'title']);
      const setColDesc = firstExisting(setCols, ['description', 'desc', 'note', 'remark']);
      const setColCreatedAt = firstExisting(setCols, ['createdAt', 'created_at']);
      const setColUpdatedAt = firstExisting(setCols, ['updatedAt', 'updated_at']);
      const setColIsDeleted = firstExisting(setCols, ['isDeleted', 'is_deleted']);
      const setColDeletedAt = firstExisting(setCols, ['deletedAt', 'deleted_at']);

      if (!setColName) {
        throw new Error(`DefaultTestSet name column not found. Existing columns: ${[...setCols].join(', ')}`);
      }

      const itemColSetId = firstExisting(itemCols, ['defaultTestSetId', 'default_test_set_id', 'setId']);
      const itemColCaseId = firstExisting(itemCols, ['testCaseId', 'test_case_id', 'caseId']);
      const itemColOrder = firstExisting(itemCols, ['sortOrder', 'order', 'idx', 'seq', 'position', 'sort']);
      const itemColCreatedAt = firstExisting(itemCols, ['createdAt', 'created_at']);
      const itemColUpdatedAt = firstExisting(itemCols, ['updatedAt', 'updated_at']);
      const itemColIsDeleted = firstExisting(itemCols, ['isDeleted', 'is_deleted']);
      const itemColDeletedAt = firstExisting(itemCols, ['deletedAt', 'deleted_at']);

      if (!itemColSetId || !itemColCaseId) {
        throw new Error(`DefaultTestSetItem FK columns not found. Existing columns: ${[...itemCols].join(', ')}`);
      }

      const now = new Date();

      // --- Upsert TestCases ---
      for (const tc of TEST_CASES) {
        const existing = await queryInterface.sequelize.query(
          `SELECT \`${tcPK}\` AS id FROM \`${tables.testCases}\` WHERE \`${tcColCode}\` = ? LIMIT 1`,
          { replacements: [tc.code], type: QueryTypes.SELECT, transaction }
        );

        const row = {};
        row[tcColCode] = tc.code;
        if (tcColTitle) row[tcColTitle] = tc.title;
        if (tcColProcedure) row[tcColProcedure] = tc.procedure;
        if (tcColCriteria) row[tcColCriteria] = tc.criteria;

        applySoftDeleteDefaults(row, tcCols, tcColIsDeleted, tcColDeletedAt);
        applyTimestamps(row, tcColCreatedAt, tcColUpdatedAt, now);

        if (existing.length) {
          const update = { ...row };
          // Don't overwrite create time on existing rows
          if (tcColCreatedAt) delete update[tcColCreatedAt];

          await queryInterface.bulkUpdate(
            tables.testCases,
            update,
            { [tcPK]: existing[0].id },
            { transaction }
          );
        } else {
          await queryInterface.bulkInsert(tables.testCases, [row], { transaction });
        }
      }

      // Build code -> id map (after upsert)
      const allCodes = TEST_CASES.map(t => t.code);
      const codeRows = await queryInterface.sequelize.query(
        `SELECT \`${tcPK}\` AS id, \`${tcColCode}\` AS code FROM \`${tables.testCases}\` WHERE \`${tcColCode}\` IN (:codes)`,
        { replacements: { codes: allCodes }, type: QueryTypes.SELECT, transaction }
      );
      const codeToId = new Map(codeRows.map(r => [String(r.code), r.id]));

      // --- Upsert DefaultTestSets and rebuild their items ---
      for (const set of DEFAULT_TEST_SETS) {
        const existingSet = await queryInterface.sequelize.query(
          `SELECT \`${setPK}\` AS id FROM \`${tables.defaultSets}\` WHERE \`${setColName}\` = ? LIMIT 1`,
          { replacements: [set.name], type: QueryTypes.SELECT, transaction }
        );

        let setId;
        if (existingSet.length) {
          setId = existingSet[0].id;
          const update = {};
          update[setColName] = set.name;
          if (setColDesc) update[setColDesc] = set.description;

          applySoftDeleteDefaults(update, setCols, setColIsDeleted, setColDeletedAt);
          applyTimestamps(update, null, setColUpdatedAt, now);

          await queryInterface.bulkUpdate(
            tables.defaultSets,
            update,
            { [setPK]: setId },
            { transaction }
          );
        } else {
          const row = {};
          row[setColName] = set.name;
          if (setColDesc) row[setColDesc] = set.description;

          applySoftDeleteDefaults(row, setCols, setColIsDeleted, setColDeletedAt);
          applyTimestamps(row, setColCreatedAt, setColUpdatedAt, now);

          await queryInterface.bulkInsert(tables.defaultSets, [row], { transaction });

          const inserted = await queryInterface.sequelize.query(
            `SELECT \`${setPK}\` AS id FROM \`${tables.defaultSets}\` WHERE \`${setColName}\` = ? LIMIT 1`,
            { replacements: [set.name], type: QueryTypes.SELECT, transaction }
          );
          if (!inserted.length) throw new Error(`Failed to fetch id for DefaultTestSet: ${set.name}`);
          setId = inserted[0].id;
        }

        // Clear old items (hard delete)
        await queryInterface.bulkDelete(
          tables.defaultItems,
          { [itemColSetId]: setId },
          { transaction }
        );

        // Insert items in order
        const items = [];
        for (let i = 0; i < set.codes.length; i++) {
          const code = set.codes[i];
          const tcId = codeToId.get(code);
          if (!tcId) throw new Error(`TestCase not found after upsert: ${code}`);

          const row = {};
          row[itemColSetId] = setId;
          row[itemColCaseId] = tcId;
          if (itemColOrder) row[itemColOrder] = i + 1;

          applySoftDeleteDefaults(row, itemCols, itemColIsDeleted, itemColDeletedAt);
          applyTimestamps(row, itemColCreatedAt, itemColUpdatedAt, now);

          items.push(row);
        }

        if (items.length) {
          await queryInterface.bulkInsert(tables.defaultItems, items, { transaction });
        }
      }

      await transaction.commit();
      console.log('✅ Seeded MF DISK Storage Set + Memory Set');
    } catch (err) {
      await transaction.rollback();
      console.error('❌ Seeder failed:', err);
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = {
        defaultSets: await resolveTable(queryInterface, ['default_test_sets', 'DefaultTestSets', 'defaultTestSets']),
        defaultItems: await resolveTable(queryInterface, ['default_test_set_items', 'DefaultTestSetItems', 'defaultTestSetItems']),
      };
      const setDesc = await queryInterface.describeTable(tables.defaultSets);
      const itemDesc = await queryInterface.describeTable(tables.defaultItems);

      const setCols = new Set(Object.keys(setDesc));
      const itemCols = new Set(Object.keys(itemDesc));

      const setPK = findPrimaryKey(setDesc);
      const setColName = firstExisting(setCols, ['name', 'setName', 'title']);
      if (!setColName) throw new Error('DefaultTestSet name column not found in down()');

      const itemColSetId = firstExisting(itemCols, ['defaultTestSetId', 'default_test_set_id', 'setId']);
      if (!itemColSetId) throw new Error('DefaultTestSetItem defaultTestSetId column not found in down()');

      const names = DEFAULT_TEST_SETS.map(s => s.name);

      // Find set ids
      const rows = await queryInterface.sequelize.query(
        `SELECT \`${setPK}\` AS id FROM \`${tables.defaultSets}\` WHERE \`${setColName}\` IN (:names)`,
        { replacements: { names }, type: QueryTypes.SELECT, transaction }
      );

      // Delete items then sets
      for (const r of rows) {
        await queryInterface.bulkDelete(
          tables.defaultItems,
          { [itemColSetId]: r.id },
          { transaction }
        );
      }

      await queryInterface.bulkDelete(
        tables.defaultSets,
        { [setColName]: names },
        { transaction }
      );

      await transaction.commit();
      console.log('↩️  Rolled back MF DISK Storage Set + Memory Set (sets/items only)');
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
