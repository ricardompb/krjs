const Tenant = require('../models/tenant.model')
const TenantUser = require('../models/tenant-user.model')
const TenantXUser = require('../models/tenant-user.model')

const findOrCreateDefaultTenant = async (ctx) => {
  const tenant = (await Tenant.get(krapp.DEFAULT_TENANT_ID, ctx)) || { id: krapp.DEFAULT_TENANT_ID, data: { name: 'default' } }
  return Tenant.createOrUpdate(tenant, ctx)
}
const bindUserToTenant = async (params, ctx) => {
  const User = require('../models/user.model')
  const Tenant = require('../models/tenant.model')
  const TenantUser = require('../models/tenant-user.model')
  const { userId, tenantId } = params
  const tenantUser = await TenantUser.findOne({ where: { data: { user: userId, tenant: tenantId } } }, ctx)
  if (tenantUser) return
  const user = await User.get(userId, ctx)
  const tenant = await Tenant.get(tenantId, ctx)
  return TenantUser.create({ data: { user, tenant } }, ctx)
}
const unBindUserToTenant = async (params, ctx) => {
  const { userId, tenantId } = params
  const tenantXUser = await TenantUser.findOne({ where: { data: { user: userId, tenant: tenantId } } }, ctx)
  if (!tenantXUser) return
  await TenantUser.remove(tenantXUser.id, ctx)
  const tenants = (await TenantXUser.findAll({ where: { data: { user: userId } } }, ctx)).map(tu => tu.data.tenant)
  return (await Tenant.findAll({ where: { id: tenants } }, ctx)).map(t => {
    return {
      id: t.id,
      name: t.data.name
    }
  })
}
const getTenantsUser = async (user, ctx) => {
  const TenantUser = require('../models/tenant-user.model')
  const tenantsUser = await (async () => {
    if (user.data.isAdmin) {
      const tenants = await Tenant.findAll({}, ctx)
      return tenants.map(tenant => {
        return {
          data: {
            tenant: tenant.id
          }
        }
      })
    }
    return TenantUser.findAll({ where: { data: { user: user.id } } }, ctx)
  })()
  const ids = [...new Set(tenantsUser.map(tenantUser => {
    const { data } = tenantUser
    return data.tenant
  }))]

  const tenants = await Tenant.findAll({ where: { id: ids } }, ctx)
  return tenants.map(tenant => {
    const { data } = tenant
    return {
      id: tenant.id,
      name: data.name
    }
  })
}
const getTenantById = async (id, ctx) => {
  return Tenant.get(id, ctx)
}

module.exports = {
  findOrCreateDefaultTenant,
  bindUserToTenant,
  getTenantsUser,
  unBindUserToTenant,
  getTenantById
}
