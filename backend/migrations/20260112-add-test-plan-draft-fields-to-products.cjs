// backend/migrations/20260112-add-test-plan-draft-fields-to-products.cjs
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "products";
    const desc = await queryInterface.describeTable(table);

    // ✅ testPlanDraft
    if (!desc.testPlanDraft) {
      await queryInterface.addColumn(table, "testPlanDraft", {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "ProductTest 草稿 JSON（UI 狀態/封面/Config/Remark 草稿等）",
      });
    }

    // ✅ testPlanDraftUpdatedAt
    if (!desc.testPlanDraftUpdatedAt) {
      await queryInterface.addColumn(table, "testPlanDraftUpdatedAt", {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "草稿最後更新時間",
      });
    }

    // ✅ testPlanDraftUpdatedBy
    if (!desc.testPlanDraftUpdatedBy) {
      await queryInterface.addColumn(table, "testPlanDraftUpdatedBy", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        comment: "草稿最後更新者 (User.id)",
      });
    }

    // ✅ index（存在就不加）
    const indexes = await queryInterface.showIndex(table);
    const hasIndex = (name) => indexes.some((i) => i.name === name);

    if (!hasIndex("idx_products_testPlanDraftUpdatedAt")) {
      await queryInterface.addIndex(table, ["testPlanDraftUpdatedAt"], {
        name: "idx_products_testPlanDraftUpdatedAt",
      });
    }

    if (!hasIndex("idx_products_testPlanDraftUpdatedBy")) {
      await queryInterface.addIndex(table, ["testPlanDraftUpdatedBy"], {
        name: "idx_products_testPlanDraftUpdatedBy",
      });
    }
  },

  async down(queryInterface) {
    const table = "products";
    const desc = await queryInterface.describeTable(table);

    // 先移除 index（存在才移）
    const indexes = await queryInterface.showIndex(table);
    const hasIndex = (name) => indexes.some((i) => i.name === name);

    if (hasIndex("idx_products_testPlanDraftUpdatedAt")) {
      await queryInterface.removeIndex(table, "idx_products_testPlanDraftUpdatedAt");
    }
    if (hasIndex("idx_products_testPlanDraftUpdatedBy")) {
      await queryInterface.removeIndex(table, "idx_products_testPlanDraftUpdatedBy");
    }

    // 再移除欄位（存在才移）
    if (desc.testPlanDraftUpdatedBy) {
      await queryInterface.removeColumn(table, "testPlanDraftUpdatedBy");
    }
    if (desc.testPlanDraftUpdatedAt) {
      await queryInterface.removeColumn(table, "testPlanDraftUpdatedAt");
    }
    if (desc.testPlanDraft) {
      await queryInterface.removeColumn(table, "testPlanDraft");
    }
  },
};
