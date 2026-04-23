"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("report_metas", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      product_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },

      project_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      report_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      revision: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      released_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      prepared_by: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      approved_by: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      prepared_signature_file_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      approved_signature_file_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },

      prepared_signature_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      approved_signature_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      summary_remark: {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // ✅ 一個 product 一筆 meta
    await queryInterface.addConstraint("report_metas", {
      fields: ["product_id"],
      type: "unique",
      name: "uq_report_metas_product_id",
    });

    // ✅（可選）FK：如果你確定 products 表名是 products（你專案多半是 snake_case）
    // 若你環境表名是 Products，你就把 model 改成 "Products"
    try {
      await queryInterface.addConstraint("report_metas", {
        fields: ["product_id"],
        type: "foreign key",
        name: "fk_report_metas_product_id",
        references: { table: "products", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    } catch {}
  },

  async down(queryInterface) {
    await queryInterface.dropTable("report_metas");
  },
};
