const Api = require('../../core/api')
const { bindUserToTenant, unBindUserToTenant, getTenantById } = require('../services/tenant.service')

module.exports = new Api.Rest({
  name: 'application/tenant',
  label: 'Domínio',
  GET: {
    'tenant-info': {
      authenticate: '*',
      handler: async (req, res) => getTenantById(req.query.id, req.ctx)
    }
  },
  POST: {
    'bind-user-tenant-do': {
      label: 'Vincular usuário a um domínio',
      transaction: 'Vincular usuário a um domínio',
      async handler (req) {
        return bindUserToTenant(req.body, req.ctx)
      }
    },
    'un-bind-user-tenant-do': {
      label: 'Remover vinculo do usuário a um domínio',
      transaction: 'Remover vinculo do usuário a um domínio',
      async handler (req) {
        return unBindUserToTenant(req.body, req.ctx)
      }
    }
  }
})
