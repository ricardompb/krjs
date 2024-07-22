const Model = require('../../core/model')
const Api = require('../../core/api')
const User = require('../../application/models/user.model')

const Acesso = new Model.Schema({
  name: 'application/role-acesso',
  model: {
    url: {
      type: Model.String,
      label: 'Url',
      required: true
    },
    tipo: {
      type: Model.String,
      label: 'Tipo',
      required: true
    },
    allow: {
      type: Model.Boolean,
      label: 'Permitido',
      default: false
    }
  }
})

const Membro = new Model.Schema({
  name: 'application/role-membro',
  model: {
    userId: {
      type: new Model.ForeignKey(User),
      label: 'Usuário',
      required: true
    }
  }
})

const loadAccess = (inst) => {
  if (!inst.data) return
  inst.data.acessos = inst.data.acessos || []
  const methods = Object.keys(Api.config)
  methods.forEach(method => {
    const apis = Api.config[method]
    Object.keys(apis).forEach(url => {
      const api = apis[url]
      if (api.anonymous === true) return
      if (api.isStatic === true) return
      if (api.authenticate === '*') return
      if (inst.data.acessos.find(acesso => acesso.data.url === url && acesso.data.tipo === method)) return
      inst.data.acessos.push({
        data: {
          url,
          tipo: method,
          allow: false
        }
      })
    })
  })
  inst.data.acessos = inst.data.acessos.sort((a, b) => {
    const x = a.data.url
    const y = b.data.url
    return x < y ? -1 : x > y ? 1 : 0
  })
}

module.exports = new Model.Schema({
  name: 'application/role',
  label: 'Papéis',
  GET: { authenticate: '*' },
  model: {
    nome: {
      type: Model.String,
      label: 'Nome',
      required: true,
      search: true
    },
    acessos: {
      type: new Model.Eager(Acesso),
      label: 'Acessos'
    },
    membros: {
      type: new Model.Eager(Membro),
      label: 'Membros',
      required: true
    }
  },
  async afterApiGet (self, inst) {
    loadAccess(inst)
  },
  async beforeCreateOrUpdate (self, inst) {
    if (inst.inserting) {
      loadAccess(inst)
    }
    const removeIndex = []
    inst.data.membros = inst.data.membros || []
    inst.data.membros.forEach((membro, index) => {
      if (!membro.data.userId) {
        removeIndex.push(index)
      }
    })
    removeIndex.forEach(index => {
      inst.data.membros.splice(index, 1)
    })
  }
})
