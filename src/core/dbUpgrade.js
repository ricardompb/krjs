const Upgrade = require('./models/upgrade.model')
const Model = require('../core/model')
const SystemError = require('./SystemError')
const { dbTransaction } = require('./transaction')
const { findOrCreateDefaultTenant } = require('../application/services/tenant.service')
const upgrades = []
const Tenant = require('../application/models/tenant.model')
const { uuid } = require('./utils')
const Command = require('../application/models/command.model')

const internalExecute = async (upgrade, data, id, ctx) => {
  if (data) return
  await upgrade.execute(ctx)
  await Upgrade.create({
    id,
    data: {
      upgradeId: upgrade.id
    }
  }, ctx)
}

const execute = async (upgrade, ctx) => {
  ctx.tenant = ctx.tenant || krapp.DEFAULT_TENANT_ID
  const { runningAllTenant } = upgrade
  if (runningAllTenant === true) {
    const tenants = await Tenant.findAll({ attributes: ['id'] }, ctx)
    for await (const tenant of tenants) {
      ctx.tenant = tenant.id
      const data = await Upgrade.findOne({ where: { data: { upgradeId: upgrade.id } } }, ctx)
      await internalExecute(upgrade, data, uuid.v1(), ctx)
    }
  } else {
    if (!upgrade.id) throw new SystemError('Você deve criar um ID para o conversor...')
    const data = await Upgrade.get(upgrade.id, ctx)
    await internalExecute(upgrade, data, upgrade.id, ctx)
  }
}
const createTenantDefault = async (ctx) => {
  return findOrCreateDefaultTenant(ctx)
}

const createCommand = async (ctx) => {
  let command = await Command.findOne({ where: { data: { name: 'CreateOrUpdateViews' } } }, ctx)
  if (!command) {
    command = {
      data: {
        name: 'CreateOrUpdateViews',
        description: 'Cria ou atualiza as views do sistema',
        verb: 'post',
        url: '/application/meta/create-or-update-view',
        body: JSON.stringify({
          name: '*'
        })
      }
    }
  }
  await Command.createOrUpdate(command, ctx)
}

const createCommandReindex = async (ctx) => {
  let command = await Command.findOne({ where: { data: { name: 'Reindex' } } }, ctx)
  if (!command) {
    command = {
      data: {
        name: 'Reindex',
        description: 'Recria todas as pesquisas dos modelos',
        verb: 'post',
        url: '/application/meta/reindex',
        body: JSON.stringify({
          name: '*'
        })
      }
    }
    await Command.createOrUpdate(command, ctx)
  }
}

module.exports = {
  Register: (upgrade) => {
    upgrades.push(upgrade)
  },
  async setup () {
    upgrades.push({ id: '40e38b1d-a3a2-486f-91ef-a702326cb8db', execute: createTenantDefault })
    upgrades.push({ id: 'faddbbc1-551b-4271-a6d0-c51347ecb6c2', execute: createCommand })
    upgrades.push({ id: 'f1f87251-8291-4580-a505-04247ddb0000', execute: createCommandReindex })
    await upgrades.forEachAsync(async upgrade => {
      await dbTransaction(async (ctx) => {
        await execute(upgrade, ctx)
      }, {
        api: {
          transaction: 'Migration Database'
        }
      })
    })

    return dbTransaction(async (ctx) => {
      await Model.createViews('*', ctx)
    }, {
      api: {
        transaction: 'Create or update all views'
      }
    })
  }
}
