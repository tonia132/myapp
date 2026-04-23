// backend/src/models/testSupport.js
import { DataTypes } from 'sequelize'

export default (sequelize) => {
  const TestSupport = sequelize.define(
    'TestSupport',
    {
      supportDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: '支援日期'
      },
      requesterDept: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '需求單位'
      },
      requester: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '需求人員'
      },
      projectName: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: '專案 / 產品名稱或客訴編號'
      },
      testType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'system',
        comment: '支援類型：system/reli/rma/cert/other'
      },
      relatedNo: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '測試單號 / 客訴單號 / 其它編號'
      },
      testContent: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '支援內容描述'
      },
      hours: {
        type: DataTypes.DECIMAL(5, 1),
        allowNull: false,
        comment: '支援工時（小時）'
      },
      status: {
        type: DataTypes.ENUM('done', 'doing', 'pending'),
        allowNull: false,
        defaultValue: 'done',
        comment: '狀態：已完成 / 進行中 / 暫緩'
      },
      supporterId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: '支援人員 ID（Users.id）'
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '備註'
      }
    },
    {
      tableName: 'TestSupports'
    }
  )

  return TestSupport
}
