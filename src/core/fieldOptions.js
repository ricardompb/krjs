const Model = require('./model')

module.exports = {
  multiTenant: false,
  isStatic: true,
  model: {
    label: {
      type: Model.String,
      label: 'Descrição',
      required: true,
      search: true
    },
    value: {
      type: Model.Integer,
      label: 'Nome',
      required: true,
      search: true
    },
    order: {
      type: Model.Integer,
      label: 'Ordenação',
      required: true,
      default: 0
    },
    color: {
      type: Model.String,
      label: 'Cor',
      default: ''
    },
    icon: {
      type: Model.String,
      label: 'Icone',
      default: ''
    }
  }
}
