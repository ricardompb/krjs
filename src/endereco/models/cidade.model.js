const Model = require('../../core/model')

module.exports = new Model.Schema({
  name: 'endereco/cidade',
  label: 'Cidade',
  multiTenant: false,
  model: {
    nome: {
      type: Model.String,
      label: 'Nome',
      required: true
    },
    ibge: {
      type: Model.String,
      label: 'Código Ibge'
    },
    gia: {
      type: Model.String,
      label: 'Código Gia'
    },
    ddd: {
      type: Model.String,
      label: 'DDD'
    },
    siafi: {
      type: Model.String,
      label: 'Siafi'
    }
  }
})
