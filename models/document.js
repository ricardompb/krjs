const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class document extends Model {}

  document.init({
    id: { type: DataTypes.UUID, primaryKey: true },
    type: { type: DataTypes.STRING, allowNull: false },
    data: { type: DataTypes.JSONB, allowNull: false },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    transactionId: { type: DataTypes.UUID, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true }
  }, {
    sequelize,
    modelName: 'document',
    tableName: 'document',
    paranoid: true
  })

  return document
}
