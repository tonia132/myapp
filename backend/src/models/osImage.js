// backend/src/models/OsImage.js
import { DataTypes } from 'sequelize'

export default (sequelize) => {
  const OsImage = sequelize.define(
    'OsImage',
    {
      osFamily: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'OS 系列：Win11 / Win10 / Win7 / XPP / XPE...'
      },
      isCustom: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否客製 image（客製：true；標準：false）'
      },
      itemNo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Excel 項次（選填）'
      },
      pnIso: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: '料號 / ISO 檔案路徑或代碼'
      },
      mbModel: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '主板型號'
      },
      mbRevision: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '主板版次'
      },
      productModels: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '對應機種（純文字，可含多個型號）'
      },
      edition: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'OS Edition (Pro / Home / IoT / Ent...)'
      },
      version: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'OS Version (21H2, 22H2...)'
      },
      licenseType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'License Type (EPKEA / PKEA ...)'
      },
      language: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '語系，例如 Multi-Lang, Eng-Twn'
      },
      excelSheet: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '來源 Excel 工作表名稱'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '備註（客戶 / 業務 / 變更紀錄）'
      }
    },
    {
      tableName: 'os_images',
      underscored: true,
      paranoid: false,
      comment: 'OS Recovery Image 清單'
    }
  )

  OsImage.associate = (models) => {
    // 之後要跟 Product / User 關聯再加
  }

  return OsImage
}
