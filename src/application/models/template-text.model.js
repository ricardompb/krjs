const Model = require('../../core/model')
const SystemError = require('../../core/SystemError')

module.exports = new Model.Schema({
  name: 'application/template-text',
  label: 'Modelo de Texto',
  model: {
    url: {
      type: Model.String,
      label: 'Url',
      unique: true,
      required: true,
      search: true
    },
    name: {
      type: Model.String,
      label: 'Nome',
      unique: true,
      required: true,
      search: true
    },
    content: {
      type: Model.String,
      label: 'Conteúdo',
      required: true
    },
    bootstrap: {
      type: Model.String,
      label: 'Versão do bootstrap'
    },
    isSystem: {
      type: Model.Boolean,
      label: 'Sistema',
      default: false,
      search: true
    }
  },
  async beforeDelete (self, inst, ctx) {
    if (inst.data.isSystem) throw new SystemError('Você não pode excluír modelo criado pelo sistema...')
  }
})
