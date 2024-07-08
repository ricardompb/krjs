const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class search extends Model {}

  search.init({
    id: { type: DataTypes.UUID, primaryKey: true },
    documentId: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    key: { type: DataTypes.STRING, allowNull: false },
    value: { type: DataTypes.TEXT, allowNull: false },
    tenantId: { type: DataTypes.UUID, allowNull: false },
  }, {
    sequelize,
    modelName: 'search',
    tableName: 'search'
  })

  return search
}
