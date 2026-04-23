/* eslint-disable no-console */
/**
 * MF DISK Storage Set + Memory Set
 *
 * ✅ This version matches your current schema where:
 *   - default_test_set_items has embedded fields (testCase/testProcedure/testCriteria...)
 *   - test_cases requires productId (so we DO NOT insert into test_cases at all)
 *
 * Source: TEAMGROUP SSD / Memory Test Report (v0006, .xlsm)
 * Generated: 2026-01-29
 */

'use strict';

const { QueryTypes } = require('sequelize');

const TEST_CASES = [
  {
    code: 'DI_001',
    title: 'To check device can be installed well with system.',
    procedure: `1. Prepare system which DUT will work in. (List system name in Remark)\n2. Install DUT into slot or the location designed for DUT, mount and tighten the screws if needed.`,
    criteria: `DUT should not have any conflict with placement of components on the board and screws (if needed) should be mounted well.`,
  },
  {
    code: 'OSI_001',
    title: 'To confirm Microsoft OS can be installed on system without problem.',
    procedure: `1. Connect storage device and USB disk to system. (USB disk stores OS installation image)\n2. Power on system and set USB disk as first bootable device.\n3. Install Microsoft OS from USB disk to storage device.`,
    criteria: `Microsoft OS should be installed on storage device without any errors and BSOD found, and it should not hang during installation.`,
  },
  {
    code: 'SDI_001',
    title: "Use HWINFO64 to check storage's information supported by system.",
    procedure: `1. Install Microsoft OS, then install HWINFO64 into OS.\n2. Execute HWINFO64, check "System Summary" to find information of storage.\n3. Compare storage's spec., system spec. and running status. (List speed & bandwidth in below table)`,
    criteria: `The running status should be the same as storage's spec. if it is system's limitation, describe it in "Remark" field. Otherwise, "Fail" should be given to this test.`,
  },
  {
    code: 'CDM_001',
    title: 'To get benchmark of read and write speed of storage device.',
    procedure: `1. Install Microsoft OS and CrystalDiskMark into storage device.\n2. Execute CrystalDiskMark to get read & write access speed.\n3. Capture picture of read & write result and attached it to this report.`,
    criteria: `1. CrystalDiskMark should run well and can come out result for each testing item.\n2. Read & Write rate should not be lower than 80% of rates listed in device spec. if system supports the rate.`,
  },
  {
    code: 'RBC_001',
    title: 'Cycling test on system reboot to confirm the stability of accessing storage device.',
    procedure: `1. Install PassMark Rebooter tool on Windows OS which installed on DUT.\n2. Boot into OS.\n3. Execute reboot test 100 times.`,
    criteria: `No error found during test.`,
  },
  {
    code: 'SST_001',
    title: "To do stress test on storage and get storage's operating temperature.",
    procedure: `1. Execute PassMark BurnInTest with 100% load of storage under OS for 4 hours.\n2. Execute HWINFO64 to record temperature of storage.`,
    criteria: `Stress test should not find error during test and average operating temperature of storage should be lower than maximum supported temperature of storage.`,
  },
  {
    code: 'SSTL_001',
    title: "To do stress test on storage and get storage's operating temperature under supported low temperature of system.",
    procedure: `1. Put system into chamber, configure chamber's temperature to lowest temperature that system supports and wait for temperature to be stable.\n2. Boot system into OS, execute PassMark BurnInTest with 100% load of storage for 4 hours.\n3. Execute HWINFO64 to record temperature of storage.`,
    criteria: `Stress test should not find error during test and average operating temperature of storage should be lower than maximum supported temperature of storage.`,
  },
  {
    code: 'SSTH_001',
    title: "To do stress test on storage and get storage's operating temperature under supported high temperature of system.",
    procedure: `1. Execute PassMark BurnInTest with 100% load of storage under OS for 4 hours.\n2. Execute HWINFO64 to record temperature of storage.`,
    criteria: `Stress test should not find error during test and average operating temperature of storage should be lower than maximum supported temperature of storage.`,
  },
  {
    code: 'MI_001',
    title: "To check memory's information recognized and supported by system.",
    procedure: `1. Execute HWINFO64 after OS booting, check "System Summary" to find information of memory.\n2. Compare memory's spec. and running status.`,
    criteria: `The running status should be the same as memory's spec. if it is system's limitation, describe it in "System" field. Otherwise, "Fail" result is confirmed.`,
  },
  {
    code: 'MPT_001',
    title: "To read/write pattern from/to memory for confirming memory's functionality.",
    procedure: `1. Prepare a bootable USB disk including MemTest86+ program.\n2. Configure USB as the first boot device.\n3. Power on system, boot into USB disk, then execute MemTest86+.\n4. Continue executing MemTest86+ testing 10 cycles.`,
    criteria: `System should be alive and MemTest86+ shows no error found.`,
  },
  {
    code: 'MST_001',
    title: "To do stress test on memory and get memory's operating temperature.",
    procedure: `1. Execute PassMark BurnInTest with 100% load of memory under OS for 4 hours.\n2. Execute HWINFO64 to record temperature of memory.`,
    criteria: `Stress test should not find error during test and average operating temperature of memory should be lower than maximum supported temperature of memory.`,
  },
  {
    code: 'MSTL_001',
    title: "To do stress test on memory and get memory's operating temperature under supported low temperature of system.",
    procedure: `1. Put system into chamber, configure chamber's temperature to lowest temperature that system supports and wait for temperature to be stable.\n2. Boot system into OS, execute PassMark BurnInTest with 100% load of memory for 4 hours.\n3. Execute HWINFO64 to record temperature of memory.`,
    criteria: `Stress test should not find error during test and average operating temperature of memory should be lower than maximum supported temperature of memory.`,
  },
  {
    code: 'MSTH_001',
    title: "To do stress test on memory and get memory's operating temperature under supported high temperature of system.",
    procedure: `1. Execute PassMark BurnInTest with 100% load of memory under OS for 4 hours.\n2. Execute HWINFO64 to record temperature of memory.`,
    criteria: `Stress test should not find error during test and average operating temperature of memory should be lower than maximum supported temperature of memory.`,
  },
];

// category / section mapping (v0006 style)
const CODE_META = {
  CDM_001: { category: '4. Performance', section: '4.1 CrystalDiskMark' },
  DI_001: { category: '2. Device Assembly', section: '2.1 Device Installation' },
  MI_001: { category: '3. Memory Functions', section: '3.1 Memory Information' },
  MPT_001: { category: '3. Memory Functions', section: '3.2 Memory Pattern Test' },
  MSTH_001: { category: '4. Reliability', section: '4.2 Stress Test under Supported High Temp. of System' },
  MSTL_001: { category: '4. Reliability', section: '4.3 Stress Test under Supported Low Temp. of System' },
  MST_001: { category: '4. Reliability', section: '4.1 Stress Test under Ambient Temperature' },
  OSI_001: { category: '3. Storage Functions', section: '3.1 Operating System Installation' },
  SDI_001: { category: '3. Storage Functions', section: '3.2 Storage Information' },
  SSTH_001: { category: '6. Reliability', section: '6.2 Stress Test under Supported High Temp. of System' },
  SSTL_001: { category: '6. Reliability', section: '6.3 Stress Test under Supported Low Temp. of System' },
  SST_001: { category: '6. Reliability', section: '6.1 Stress Test under Ambient Temperature' },
};

const DEFAULT_TEST_SETS = [
  {
    name: 'MF DISK Storage Set',
    description: 'Imported from TEAMGROUP SSD Test Report (v0006): sheets DA/SF/PF/ST/RE',
    codes: ['DI_001', 'OSI_001', 'SDI_001', 'CDM_001', 'RBC_001', 'SST_001', 'SSTL_001', 'SSTH_001'],
  },
  {
    name: 'Memory Set',
    description: 'Imported from TEAMGROUP Memory Test Report (v0006): sheets DA/MF/RE',
    codes: ['DI_001', 'MI_001', 'MPT_001', 'MST_001', 'MSTL_001', 'MSTH_001'],
  },
];

function firstExisting(cols, candidates) {
  for (const c of candidates) if (cols.has(c)) return c;
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
  if (isDeletedCol && cols.has(isDeletedCol) && row[isDeletedCol] === undefined) row[isDeletedCol] = false;
  if (deletedAtCol && cols.has(deletedAtCol) && row[deletedAtCol] === undefined) row[deletedAtCol] = null;
  return row;
}

function applyTimestamps(row, createdAtCol, updatedAtCol, now) {
  if (createdAtCol && row[createdAtCol] === undefined) row[createdAtCol] = now;
  if (updatedAtCol) row[updatedAtCol] = now;
  return row;
}

module.exports = {
  async up(queryInterface) {
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

      // --- Column mapping (auto-detect to match your existing DB/Sequelize fields) ---
      const setColName = firstExisting(setCols, ['name', 'setName', 'title']);
      const setColDesc = firstExisting(setCols, ['description', 'desc', 'note', 'remark']);
      const setColCreatedAt = firstExisting(setCols, ['createdAt', 'created_at']);
      const setColUpdatedAt = firstExisting(setCols, ['updatedAt', 'updated_at']);
      const setColIsDeleted = firstExisting(setCols, ['isDeleted', 'is_deleted']);
      const setColDeletedAt = firstExisting(setCols, ['deletedAt', 'deleted_at']);

      if (!setColName) {
        throw new Error(`DefaultTestSet name column not found. Existing columns: ${[...setCols].join(', ')}`);
      }

      const itemColSetId = firstExisting(itemCols, ['defaultTestSetId', 'default_test_set_id', 'setId', 'testSetId']);
      const itemColOrder = firstExisting(itemCols, ['sortOrder', 'order', 'idx', 'seq', 'position', 'sort', 'orderNo']);

      const itemColCategory = firstExisting(itemCols, ['category', 'cat']);
      const itemColSection = firstExisting(itemCols, ['section', 'subSection', 'subsection', 'group']);
      const itemColCode = firstExisting(itemCols, ['code', 'caseCode', 'tcCode', 'testCode']);
      const itemColTestCase = firstExisting(itemCols, ['testCase', 'title', 'name', 'testName']);
      const itemColProcedure = firstExisting(itemCols, ['testProcedure', 'procedure', 'steps', 'testSteps', 'method', 'content', 'description', 'desc']);
      const itemColCriteria = firstExisting(itemCols, ['testCriteria', 'criteria', 'expected', 'expectedResult', 'passCriteria', 'acceptanceCriteria']);
      const itemColEstHours = firstExisting(itemCols, ['estHours', 'estimatedHours', 'hours', 'manHours', 'workHours', 'effort']);
      const itemColIsPlanned = firstExisting(itemCols, ['isPlanned', 'planned', 'enabled', 'isEnabled', 'active']);
      const itemColCreatedAt = firstExisting(itemCols, ['createdAt', 'created_at']);
      const itemColUpdatedAt = firstExisting(itemCols, ['updatedAt', 'updated_at']);
      const itemColIsDeleted = firstExisting(itemCols, ['isDeleted', 'is_deleted']);
      const itemColDeletedAt = firstExisting(itemCols, ['deletedAt', 'deleted_at']);

      if (!itemColSetId) {
        throw new Error(`DefaultTestSetItem FK column (setId) not found. Existing columns: ${[...itemCols].join(', ')}`);
      }

      // If your table stores embedded fields, these should exist.
      const missingEmbedded = [];
      if (!itemColCode) missingEmbedded.push('code');
      if (!itemColTestCase) missingEmbedded.push('testCase/title');
      if (!itemColProcedure) missingEmbedded.push('testProcedure/procedure');
      if (!itemColCriteria) missingEmbedded.push('testCriteria/criteria');
      if (missingEmbedded.length) {
        throw new Error(
          `DefaultTestSetItem embedded columns missing: ${missingEmbedded.join(', ')}. Existing columns: ${[...itemCols].join(', ')}`
        );
      }

      const now = new Date();

      // --- Upsert DefaultTestSets (by name) ---
      const setNameToId = new Map();
      for (const s of DEFAULT_TEST_SETS) {
        const existing = await queryInterface.sequelize.query(
          `SELECT ${setPK} AS id FROM ${tables.defaultSets} WHERE ${setColName} = :name LIMIT 1`,
          { replacements: { name: s.name }, type: QueryTypes.SELECT, transaction }
        );

        let setId;
        if (existing && existing[0] && existing[0].id != null) {
          setId = existing[0].id;

          const patch = {};
          if (setColDesc && setCols.has(setColDesc)) patch[setColDesc] = s.description;
          applySoftDeleteDefaults(patch, setCols, setColIsDeleted, setColDeletedAt);
          applyTimestamps(patch, setColCreatedAt, setColUpdatedAt, now);

          await queryInterface.bulkUpdate(
            tables.defaultSets,
            patch,
            { [setPK]: setId },
            { transaction }
          );
        } else {
          const row = {};
          row[setColName] = s.name;
          if (setColDesc && setCols.has(setColDesc)) row[setColDesc] = s.description;
          applySoftDeleteDefaults(row, setCols, setColIsDeleted, setColDeletedAt);
          applyTimestamps(row, setColCreatedAt, setColUpdatedAt, now);

          await queryInterface.bulkInsert(tables.defaultSets, [row], { transaction });

          const created = await queryInterface.sequelize.query(
            `SELECT ${setPK} AS id FROM ${tables.defaultSets} WHERE ${setColName} = :name ORDER BY ${setPK} DESC LIMIT 1`,
            { replacements: { name: s.name }, type: QueryTypes.SELECT, transaction }
          );
          if (!created || !created[0] || created[0].id == null) throw new Error(`Failed to create DefaultTestSet: ${s.name}`);
          setId = created[0].id;
        }

        setNameToId.set(s.name, setId);
      }

      // --- Replace items for each set ---
      for (const s of DEFAULT_TEST_SETS) {
        const setId = setNameToId.get(s.name);

        // remove existing items (hard delete to avoid duplicates)
        await queryInterface.bulkDelete(tables.defaultItems, { [itemColSetId]: setId }, { transaction });

        const rows = [];
        for (let i = 0; i < s.codes.length; i++) {
          const code = s.codes[i];
          const tc = TEST_CASES.find((x) => x.code === code);
          if (!tc) throw new Error(`Missing TEST_CASES definition for code: ${code}`);

          const meta = CODE_META[code] || {};
          const row = {};
          row[itemColSetId] = setId;
          if (itemColOrder) row[itemColOrder] = i + 1;

          if (itemColCategory) row[itemColCategory] = meta.category || '';
          if (itemColSection) row[itemColSection] = meta.section || '';
          if (itemColCode) row[itemColCode] = code;
          if (itemColTestCase) row[itemColTestCase] = tc.title || '';
          if (itemColProcedure) row[itemColProcedure] = tc.procedure || '';
          if (itemColCriteria) row[itemColCriteria] = tc.criteria || '';

          if (itemColEstHours) row[itemColEstHours] = 0;
          if (itemColIsPlanned) row[itemColIsPlanned] = true;

          applySoftDeleteDefaults(row, itemCols, itemColIsDeleted, itemColDeletedAt);
          applyTimestamps(row, itemColCreatedAt, itemColUpdatedAt, now);
          rows.push(row);
        }

        if (rows.length) {
          await queryInterface.bulkInsert(tables.defaultItems, rows, { transaction });
        }
      }

      await transaction.commit();
      console.log('✅ Seeded DefaultTestSets: MF DISK Storage Set + Memory Set (embedded items only)');
    } catch (err) {
      await transaction.rollback();
      console.error('❌ Seeder failed:', err);
      throw err;
    }
  },

  async down(queryInterface) {
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
      const itemColSetId = firstExisting(itemCols, ['defaultTestSetId', 'default_test_set_id', 'setId', 'testSetId']);

      if (!setColName || !itemColSetId) {
        throw new Error(`Cannot rollback: missing columns. setColName=${setColName}, itemColSetId=${itemColSetId}`);
      }

      // find ids then delete items then sets
      for (const s of DEFAULT_TEST_SETS) {
        const existing = await queryInterface.sequelize.query(
          `SELECT ${setPK} AS id FROM ${tables.defaultSets} WHERE ${setColName} = :name LIMIT 1`,
          { replacements: { name: s.name }, type: QueryTypes.SELECT, transaction }
        );
        const setId = existing && existing[0] ? existing[0].id : null;
        if (setId != null) {
          await queryInterface.bulkDelete(tables.defaultItems, { [itemColSetId]: setId }, { transaction });
        }
      }

      await queryInterface.bulkDelete(
        tables.defaultSets,
        { [setColName]: DEFAULT_TEST_SETS.map((x) => x.name) },
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Rollback complete: MF DISK Storage Set + Memory Set');
    } catch (err) {
      await transaction.rollback();
      console.error('❌ Seeder rollback failed:', err);
      throw err;
    }
  },
};
