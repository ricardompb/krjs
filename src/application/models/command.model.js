const Model = require('../../core/model')

module.exports = new Model.Schema({
  name: 'application/command',
  label: 'Comando',
  multiTenant: false,
  model: {
    name: {
      type: Model.String,
      label: 'Nome',
      required: true,
      search: true
    },
    description: {
      type: Model.String,
      label: 'Descrição',
      required: true,
      search: true
    },
    verb: {
      type: Model.String,
      label: 'Verbo',
      required: true,
      search: true
    },
    url: {
      type: Model.String,
      label: 'Comando',
      required: true,
      search: true
    },
    body: {
      type: Model.String,
      label: 'Corpo'
    }
  }
})
