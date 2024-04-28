const Model = require('../../core/model')

module.exports = new Model.Schema({
  name: 'application/command',
  label: 'Comando',
  multiTenant: false,
  model: {
    name: {
      type: Model.String,
      label: 'Nome',
      required: true
    },
    description: {
      type: Model.String,
      label: 'Descrição',
      required: true
    },
    verb: {
      type: Model.String,
      label: 'Verbo',
      required: true
    },
    url: {
      type: Model.String,
      label: 'Comando',
      required: true
    },
    body: {
      type: Model.String,
      label: 'Corpo'
    }
  }
})
