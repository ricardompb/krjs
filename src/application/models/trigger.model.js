const Model = require('../../core/model')

module.exports = new Model.Schema({
  name: 'application/trigger',
  label: 'Gatilhos',
  model: {
    name: {
      type: Model.String,
      label: 'Nome',
      required: true,
      search: true
    },
    tipo: {
      type: Model.String,
      label: 'Tipo',
      required: true,
      default: 'entity',
      search: true
    },
    description: {
      type: Model.String,
      label: 'Descrição',
      search: true
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
