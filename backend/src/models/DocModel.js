// backend/src/models/DocModel.js
import { DataTypes, Op } from "sequelize";

export default (sequelize) => {
  const DocModel = sequelize.define(
    "DocModel",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      modelFamily: {
        type: DataTypes.STRING(80),
        allowNull: false,
        comment: "機種系列 (Family)",
      },

      modelCode: {
        type: DataTypes.STRING(80),
        allowNull: false,
        comment: "機種代碼 (Code)",
      },

      docProgress: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "文件進度 0~100",
      },

      docRemark: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "備註",
      },
    },
    {
      tableName: "doc_models",

      // ⚠️ 如果你的表沒有 createdAt/updatedAt，改成 false
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      underscored: false,

      indexes: [
        {
          unique: true,
          fields: ["modelFamily", "modelCode"],
          name: "uniq_doc_models_family_code",
        },
        { fields: ["modelFamily"], name: "idx_doc_models_family" },
        { fields: ["modelCode"], name: "idx_doc_models_code" },
        { fields: ["docProgress"], name: "idx_doc_models_progress" },
        { fields: ["updatedAt"], name: "idx_doc_models_updatedAt" },
      ],

      defaultScope: {
        order: [
          ["modelFamily", "ASC"],
          ["modelCode", "ASC"],
          ["id", "ASC"],
        ],
      },

      scopes: {
        byFamily(modelFamily) {
          return { where: { modelFamily } };
        },
        byCode(modelCode) {
          return { where: { modelCode } };
        },
        search(kw) {
          const k = String(kw ?? "").trim();
          if (!k) return {};
          const like = `%${k}%`;
          return {
            where: {
              [Op.or]: [
                { modelFamily: { [Op.like]: like } },
                { modelCode: { [Op.like]: like } },
                { docRemark: { [Op.like]: like } },
              ],
            },
          };
        },
      },

      validate: {
        docProgressRange() {
          const n = Number(this.docProgress);
          if (!Number.isFinite(n) || n < 0 || n > 100) {
            throw new Error("docProgress 必須在 0~100 之間");
          }
        },
      },

      hooks: {
        beforeValidate(row) {
          if (row.modelFamily != null) row.modelFamily = String(row.modelFamily).trim();
          if (row.modelCode != null) row.modelCode = String(row.modelCode).trim();
          if (row.docRemark != null) row.docRemark = String(row.docRemark).trim();

          // docProgress：轉數字 + 夾在 0~100
          const n = Number(row.docProgress);
          if (!Number.isFinite(n)) row.docProgress = 0;
          else row.docProgress = Math.max(0, Math.min(100, Math.round(n)));
        },
      },
    }
  );

  // 預留關聯（若之後要接 User / SafetyReport 再加）
  DocModel.associate = () => {};

  return DocModel;
};
