const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class sequence extends Model {}

  sequence.init({
    type: DataTypes.STRING,
    value: DataTypes.BIGINT,
    tenantId: DataTypes.UUID
  }, {
    sequelize,
    modelName: 'sequence',
    tableName: 'sequence'
  })

  return sequence
}
