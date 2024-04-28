const Model = require('../../core/model')
const Tenant = require('./tenant.model')
const User = require('./user.model')

module.exports = new Model.Schema({
  name: 'application/tenant-user',
  label: 'Domínio/Usuário',
  multiTenant: false,
  model: {
    user: {
      type: new Model.ForeignKey(User),
      label: 'Usuário',
      required: true
    },
    tenant: {
      type: new Model.ForeignKey(Tenant),
      label: 'Domínio',
      required: true
    }
  }
})
