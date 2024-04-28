const Model = require('../../core/model')

module.exports = new Model.Schema({
  name: 'endereco/pais',
  label: 'País',
  multiTenant: false,
  model: {
    nome: {
      type: Model.String,
      label: 'Nome',
      required: true
    }
  }
})
