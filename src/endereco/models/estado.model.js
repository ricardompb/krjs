const Model = require('../../core/model')

module.exports = new Model.Schema({
  name: 'endereco/estado',
  label: 'Estado',
  multiTenant: false,
  model: {
    nome: {
      type: Model.String,
      label: 'Nome',
      required: true
    },
    sigla: {
      type: Model.String,
      label: 'Sigla',
      required: true
    }
  }
})
