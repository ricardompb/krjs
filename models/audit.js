const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class audit extends Model {}

  audit.init({
    id: { type: DataTypes.UUID, primaryKey: true },
    documentId: { type: DataTypes.UUID, allowNull: false },
    documentInst: { type: DataTypes.JSONB, allowNull: false },
    event: { type: DataTypes.STRING(1), allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  }, {
    sequelize,
    modelName: 'audit',
    tableName: 'audit'
  })

  return audit
}
