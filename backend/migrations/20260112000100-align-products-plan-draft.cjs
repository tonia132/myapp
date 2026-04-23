// backend/src/migrations/20260112000100-align-products-plan-draft.cjs
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "products";
    const cols = await queryInterface.describeTable(tableName);

    const addIfMissing = async (name, spec) => {
      if (!cols[name]) {
        await queryInterface.addColumn(tableName, name, spec);
      }
    };

    await addIfMissing("isDeleted", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "軟刪除",
    });

    await addIfMissing("progress", {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "測試進度百分比 (0~100)",
    });

    await addIfMissing("planLocked", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "是否鎖定測試計畫",
    });

    await addIfMissing("reportMeta", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Legacy report meta (TEXT/JSON-string)",
    });

    await addIfMissing("testPlanDraft", {
      type: Sequelize.JSON,
      allowNull: true,
      comment: "ProductTest 草稿 JSON",
    });

    await addIfMissing("testPlanDraftUpdatedBy", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "草稿最後更新者",
    });

    await addIfMissing("testPlanDraftUpdatedAt", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "草稿最後更新時間",
    });

    // 索引：有就跳過（MySQL duplicate index 會丟錯 → catch 掉）
    const safeAddIndex = async (fields, options = {}) => {
      try {
        await queryInterface.addIndex(tableName, fields, options);
      } catch (_) {}
    };

    await safeAddIndex(["createdBy"]);
    await safeAddIndex(["name"]);
    await safeAddIndex(["model"]);
    await safeAddIndex(["planLocked"]);
    await safeAddIndex(["isDeleted"]);
    await safeAddIndex(["testPlanDraftUpdatedAt"]);
  },

  async down(queryInterface, _Sequelize) {
    const tableName = "products";
    const cols = await queryInterface.describeTable(tableName);

    const dropIfExists = async (name) => {
      if (cols[name]) await queryInterface.removeColumn(tableName, name);
    };

    await dropIfExists("testPlanDraftUpdatedAt");
    await dropIfExists("testPlanDraftUpdatedBy");
    await dropIfExists("testPlanDraft");
    await dropIfExists("reportMeta");
    await dropIfExists("planLocked");
    await dropIfExists("progress");
    await dropIfExists("isDeleted");
  },
};
