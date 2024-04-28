const Model = require('../../core/model')
const File = require('./file.model')
const { unmask } = require('../../core/utils')
const SystemError = require('../../core/SystemError')
const { literal } = Model
const TenantXUser = require('../models/tenant-user.model')
const Tenant = require('../models/tenant.model')

module.exports = new Model.Schema({
  name: 'application/user',
  label: 'Usuário',
  multiTenant: false,
  model: {
    email: {
      type: Model.String,
      label: 'E-mail',
      required: true,
      unique: true,
      isEmail: true
    },
    nome: {
      type: Model.String,
      label: 'Nome'
    },
    telefone: {
      type: Model.String,
      label: 'Telefone',
      unmask
    },
    password: {
      type: Model.String,
      label: 'Senha'
    },
    fotoId: {
      type: new Model.ForeignKey(File),
      label: 'Foto'
    },
    isAdmin: {
      type: Model.Boolean,
      label: 'Administrador',
      default: false
    },
    isSystem: {
      type: Model.Boolean,
      label: 'Sistema',
      default: false
    },
    code: {
      type: Model.Integer,
      label: 'Código para reset de password'
    }
  },
  report: {
    columns: [
      { text: 'E-mail', style: 'columnsHeader' },
      { text: 'Nome', style: 'columnsHeader' },
      { text: 'Telefone', style: 'columnsHeader' }
    ],
    reportData (documents, body) {
      for (const document of documents) {
        const rows = []
        rows.push(document.data.email)
        rows.push(document.data.nome || '')
        rows.push(document.data.telefone || '')
        body.push(rows)
      }
    }
  },
  async beforeCreateOrUpdate (self, inst, ctx) {
    if (ctx?.user?.data?.isAdmin === true) return
    if (!inst.inserting && ctx.user && ctx.user.id !== inst.id) {
      throw new SystemError('Você não pode alterar os dados desse usuário...')
    }
  },
  async afterCreateOrUpdate (self, inst, ctx) {
    ctx.custom = ctx.custom || {}
    const { ignoreBindTenant } = ctx.custom
    if (ignoreBindTenant !== true) {
      const { bindUserToTenant } = require('../services/tenant.service')
      await bindUserToTenant({
        userId: inst.id,
        tenantId: ctx.tenant || krapp.DEFAULT_TENANT_ID
      }, ctx)
    }
  },
  async beforeApiGet (req, options) {
    const and = Model.and(options)
    if (!req.ctx.user.data.isAdmin) {
      and.push({
        literal: literal(`data->>'isAdmin' = 'false' and 
                              exists (select t.id from 
                                      "application/tenant-user" t
                                      where t."tenant" = '${req.ctx.tenant}'
                                      and t."user" = d.id)`)
      })
    }
  },
  async beforeDelete (self, inst, ctx) {
    if (!ctx.force && inst.id === ctx.user.id) {
      throw new SystemError('Exclusão não permitida.')
    }
  },
  async afterApiGet (self, inst, ctx) {
    if (inst?.data) {
      inst.data.custom = inst.data.custom || {}
      const tenants = (await TenantXUser.findAll({ where: { data: { user: inst.id } } }, ctx)).map(tu => tu.data.tenant)
      inst.data.custom.tenants = (await Tenant.findAll({ where: { id: tenants } }, ctx)).map(t => {
        return {
          id: t.id,
          name: t.data.name
        }
      })
      inst.data.custom.tenants = inst.data.custom.tenants.sort((a, b) => a.name - b.name)
    }
  }
})
