const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class sequence extends Model {}

  sequence.init({
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    value: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
  }, {
    sequelize,
    modelName: 'sequence',
    tableName: 'sequence'
  })

  return sequence
}
