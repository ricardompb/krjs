const Model = require('../../core/model')

module.exports = new Model.Schema({
  name: 'application/trigger',
  label: 'Gatilhos',
  model: {
    name: {
      type: Model.String,
      label: 'Nome',
      required: true
    },
    tipo: {
      type: Model.String,
      label: 'Tipo',
      required: true,
      default: 'entity'
    },
    description: {
      type: Model.String,
      label: 'Descrição'
    },
    beforeExecute: {
      type: Model.String,
      label: 'Antes'
    },
    afterExecute: {
      type: Model.String,
      label: 'Depois'
    }
  }
})
