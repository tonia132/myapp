"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) 找出真正的表名（支援 test_cases / testcases）
    const rawTables = await queryInterface.showAllTables();

    const tables = (rawTables || [])
      .map((t) => {
        // mysql 可能回傳 string 或 { tableName }
        if (typeof t === "string") return t;
        if (t && typeof t === "object") return t.tableName || t.name || "";
        return "";
      })
      .filter(Boolean)
      .map((s) => String(s));

    const lower = new Map(tables.map((t) => [t.toLowerCase(), t]));

    const tableName =
      lower.get("test_cases") ||
      lower.get("testcases") ||
      null;

    if (!tableName) {
      throw new Error(
        `Cannot add column "extra": table not found. Existing tables: ${tables.join(", ")}`
      );
    }

    // 2) 如果欄位已存在就跳過
    const desc = await queryInterface.describeTable(tableName);
    if (desc.extra) return;

    // 3) 新增 JSON 欄位 extra
    await queryInterface.addColumn(
      tableName,
      "extra",
      {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Template-driven extra fields (v0006)",
      }
    );
  },

  async down(queryInterface) {
    const rawTables = await queryInterface.showAllTables();

    const tables = (rawTables || [])
      .map((t) => {
        if (typeof t === "string") return t;
        if (t && typeof t === "object") return t.tableName || t.name || "";
        return "";
      })
      .filter(Boolean)
      .map((s) => String(s));

    const lower = new Map(tables.map((t) => [t.toLowerCase(), t]));

    const tableName =
      lower.get("test_cases") ||
      lower.get("testcases") ||
      null;

    if (!tableName) return;

    // 欄位不存在就不做事
    const desc = await queryInterface.describeTable(tableName);
    if (!desc.extra) return;

    await queryInterface.removeColumn(tableName, "extra");
  },
};
