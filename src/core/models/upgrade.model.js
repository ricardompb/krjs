const Model = require('../model')

module.exports = new Model.Schema({
  name: 'application/upgrade',
  label: 'Atualização',
  model: {
    upgradeId: {
      type: Model.String
    }
  }
})
