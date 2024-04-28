const Model = require('../../core/model')

module.exports = new Model.Schema({
  name: 'application/origem',
  label: 'Origem',
  model: {
    origemId: {
      type: Model.String,
      label: 'Id',
      requiraed: true
    },
    url: {
      type: Model.String,
      label: 'Url de redirecionamento',
      required: true
    },
    descricao: {
      type: Model.String,
      label: 'Descrição',
      required: true
    }
  }
})
