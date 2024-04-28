const Model = require('../../core/model')
const { encrypt } = require('../../core/bcrypt')

module.exports = new Model.Schema({
  name: 'application/parameter',
  label: 'Parâmetro',
  model: {
    name: {
      type: Model.String,
      label: 'Nome',
      required: true
    },
    label: {
      type: Model.String,
      label: 'Título',
      required: true
    },
    value: {
      type: Model.JSON,
      label: 'Valor'
    },
    tab: {
      type: Model.String,
      label: 'Aba'
    },
    group: {
      type: Model.String,
      label: 'Grupo'
    },
    component: {
      type: Model.String,
      label: 'Componente'
    },
    options: {
      type: Model.JSON,
      label: 'Opções'
    }
  },
  async beforeCreateOrUpdate (self, inst, ctx) {
    if (inst.data.component === 'kr-input-password') {
      const old = await self.get(inst.id, ctx)
      if (old && old.data && old.data.value !== inst.data.value) {
        inst.data.value = encrypt(inst.data.value)
      }
    }
  }
})
