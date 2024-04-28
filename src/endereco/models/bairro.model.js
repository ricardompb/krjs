const Model = require('../../core/model')

module.exports = new Model.Schema({
  name: 'endereco/bairro',
  label: 'Bairro',
  multiTenant: false,
  model: {
    nome: {
      type: Model.String,
      label: 'Nome',
      required: true
    }
  }
})
