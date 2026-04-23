// backend/src/models/Equipment.js
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Equipment = sequelize.define(
    'Equipment',
    {
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      assetCode: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      keeper: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      totalQty: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      availableQty: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      calibrationDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      imageUrl: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      remark: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdBy: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true
      },
      updatedBy: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true
      }
    },
    {
      tableName: 'equipments',
      timestamps: true
    }
  );

  Equipment.associate = (models) => {
    Equipment.hasMany(models.EquipmentLoan, {
      foreignKey: 'equipmentId',
      as: 'loans'
    });

    Equipment.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    Equipment.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  };

  return Equipment;
};
