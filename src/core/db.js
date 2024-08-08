const { Sequelize, DataTypes, Op, literal } = require('sequelize')
const logger = require('./logger')
const { uuid } = require('./utils')
const SystemError = require('./SystemError')

const logging = (val) => {
  const level = val.match(/(--SILLY--)|(START TRANSACTION;)|(COMMIT;)/) ? 'silly' : 'debug'
  logger[level](val)
}

const sequelize = new Sequelize(process.env.ENVIRONMENT_DATABASE_NAME, process.env.ENVIRONMENT_DATABASE_USERNAME, process.env.ENVIRONMENT_DATABASE_PASSWORD, {
  host: process.env.ENVIRONMENT_DATABASE_HOST,
  port: process.env.ENVIRONMENT_DATABASE_PORT,
  dialect: process.env.ENVIRONMENT_DATABASE_DIALECT,
  logging
})

const document = require('../../models/document')(sequelize, DataTypes)
const sequence = require('../../models/sequence')(sequelize, DataTypes)
const audit = require('../../models/audit')(sequelize, DataTypes)
const search = require('../../models/search')(sequelize, DataTypes)

document.hasMany(audit)
audit.belongsTo(document, { foreignKey: 'documentId' })

async function createTables () {
  await document.sync()
  await sequence.sync()
  await audit.sync()
  await search.sync()
}

async function createIndex () {
  // create index document
  await execute('CREATE INDEX IF NOT EXISTS "document/type" ON document (type)')
  await execute('CREATE INDEX IF NOT EXISTS "document/tenantId" ON document ("tenantId")')
  await execute('CREATE INDEX IF NOT EXISTS "document/createdAt" ON document ("createdAt")')
  await execute('CREATE INDEX IF NOT EXISTS "document/updatedAt" ON document ("updatedAt")')
  await execute('CREATE INDEX IF NOT EXISTS "document/deletedAt" ON document ("deletedAt")')
  await execute('CREATE INDEX IF NOT EXISTS "document/data" ON document USING gin (data)')

  // create index search
  await execute('CREATE INDEX IF NOT EXISTS "search/documentId" ON search ("documentId")')
  await execute('CREATE INDEX IF NOT EXISTS "search/type" ON search ("type")')
  await execute('CREATE INDEX IF NOT EXISTS "search/key" ON search ("key")')
  await execute('CREATE INDEX IF NOT EXISTS "search/value" ON search ("value")')
  await execute('CREATE INDEX IF NOT EXISTS "search/tenantId" ON search ("tenantId")')
}

async function createExtensions () {
  await execute('CREATE EXTENSION IF NOT EXISTS unaccent;')
}

const getCurrentTenant = (ctx) => {
  if (!krapp) return '6a942c55-6573-45ac-bde7-50c0c1c55480'
  return ctx?.tenant || krapp.DEFAULT_TENANT_ID
}
const execute = async (sql, ctx = {}) => {
  try {
    const commandText = (() => {
      sql = /--TENANT--/.test(sql)
        ? sql.replace(/--TENANT--/, getCurrentTenant(ctx))
        : sql
      return sql
    })()
    const profiler = logger.startTimer()
    const [result] = await sequelize.query(commandText, ctx)
    profiler.done({ message: `core/db.execute slow sql=${sql}`, sql, timeout, timeoutError: true })
    return result
  } catch (e) {
    throw new Error(e)
  }
}
const connect = async () => {
  const cluster = require('../core/cluster')
  if (!cluster.isMaster) return
  try {
    await createTables()
    await createIndex()
    await createExtensions()
    await sequelize.authenticate()
  } catch (e) {
    throw new Error(e)
  }
}
const setFilterTenant = (options, ctx) => {
  if (ctx.ignoreTenant === true) return
  if (!options.multiTenant) return
  options.where = options.where || {}
  if (!options.where.tenantId) {
    options.where.tenantId = getCurrentTenant(ctx)
  }
}

const getSequence = async (type, ctx, inc = 1) => {
  const profiler = logger.startTimer()
  const { Transaction } = Sequelize
  const { ISOLATION_LEVELS } = Transaction
  const { READ_UNCOMMITTED } = ISOLATION_LEVELS
  const transaction = await sequelize.transaction({
    isolationLevel: READ_UNCOMMITTED
  })
  try {
    let seq = await sequence.findOne({
      where: { type, tenantId: ctx.tenant },
      transaction,
      lock: transaction.LOCK.UPDATE
    })
    if (!seq) {
      seq = { id: uuid.v1(), type, value: 0, tenantId: ctx.tenant }
    }
    seq.value = parseFloat(seq.value) + inc
    if (seq.save) {
      await seq.save({ transaction })
    } else {
      await sequence.create(seq, { transaction })
    }
    await transaction.commit()
    profiler.done({ message: `core/db.getSequence slow type=${type}`, timeout, timeoutError: true })
    return seq.value
  } catch (e) {
    await transaction.rollback()
    throw e
  }
}

const EVENT = {
  CREATE: 'C',
  RESTORE: 'R',
  UPDATE: 'U',
  DELETE: 'D'
}

const createAudit = async (inst, event, ctx) => {
  const { canCreateAudit, user } = ctx
  if (!user || !canCreateAudit) return
  return audit.create({
    id: uuid.v1(),
    documentId: inst.id,
    documentInst: inst,
    event,
    userId: user.id
  }, {
    transaction: ctx.transaction
  })
}

const getAudit = async (inst, ctx) => {
  const { canCreateAudit, user } = ctx
  if (!user || !canCreateAudit) return
  const audits = await inst.getAudits()
  const ids = audits.map(audit => audit.userId)
  const users = await document.findAll({ where: { id: ids } })
  audits.forEach(audit => (audit.userId = users.find(x => x.id === `${audit.userId}`)))
  return audits
}

const timeout = process.env.ENVIRONMENT_DATABASE_SLOWQUERY || 10000

module.exports = {
  connect,
  execute,
  document: {
    async get (id, options = {}, ctx = {}) {
      if (!id) return
      const profiler = logger.startTimer()
      const inst = await document.findByPk(id, {
        paranoid: false,
        transaction: ctx.transaction
      })
      profiler.done({ message: `core/db.get slow id=${id}`, timeout, timeoutError: true })
      return inst
    },
    async findOne (options, ctx = {}) {
      const profiler = logger.startTimer()
      setFilterTenant(options, ctx)
      const result = await document.findOne({
        ...options,
        transaction: ctx.transaction
      })
      profiler.done({ message: 'core/db.findOne slow', timeout, timeoutError: true })
      return result
    },
    async findAll (options, ctx = {}) {
      const profiler = logger.startTimer()
      setFilterTenant(options, ctx)
      const result = await document.findAll({
        ...options,
        transaction: ctx.transaction
      })
      profiler.done({ message: 'core/db.findAll slow', timeout, timeoutError: true })
      return result
    },
    async count (options, ctx) {
      setFilterTenant(options, ctx)
      return document.count(options)
    },
    async findAndCount (options, ctx = {}) {
      const [rows, count] = await Promise.all([
        this.findAll(options, ctx),
        this.count(options, ctx)
      ])
      return { count, rows }
    },
    async createOrUpdate (type, inst, ctx = {}) {
      if (!ctx.transaction) {
        throw new SystemError('Transaction undefined...')
      }

      const profiler = logger.startTimer()

      if (!inst.createdAt) {
        const tenantId = getCurrentTenant(ctx)
        const createdInst = await document.create({
          id: inst.id || uuid.v1(),
          type: inst.type || type.name,
          data: inst.data,
          tenantId: inst.tenantId || tenantId
        }, {
          transaction: ctx.transaction
        })
        await createAudit(createdInst, EVENT.CREATE, ctx)
        return createdInst
      }

      const oldInst = await document.findByPk(inst.id, {
        transaction: ctx.transaction
      })

      await createAudit(oldInst, EVENT.UPDATE, ctx)
      inst.changed('data', true)
      const result = await inst.save({ transaction: ctx.transaction })

      profiler.done({ message: `core/db.document.createOrUpdate slow id=${inst.id}`, timeout, timeoutError: true })
      return result
    }
  },
  search: {
    async createOrUpdate (type, documentId, key, value, ctx = {}) {
      const tenantId = getCurrentTenant(ctx)

      const profiler = logger.startTimer()
      const row = await search.findOne({
        where: {
          type,
          documentId,
          key,
          tenantId
        },
        transaction: ctx.transaction
      })

      if (!row) {
        return search.create({
          id: uuid.v1(),
          type,
          documentId,
          key,
          value: value || '',
          tenantId
        }, {
          transaction: ctx.transaction
        })
      }

      row.value = value
      await row.save({
        transaction: ctx.transaction
      })
      profiler.done({ message: `core/db.search.createOrUpdate slow id=${row.id}`, timeout, timeoutError: true })
      return row
    },
    async findAll(options, ctx = {}) {
      options.where = options.where || {}
      options.where.tenantId = getCurrentTenant(ctx)
      return search.findAll({
        ...options,
        transaction: ctx.transaction
      })
    }
  },
  Op,
  sequelize,
  literal,
  getSequence,
  UUID: DataTypes.UUID,
  createAudit,
  EVENT,
  getAudit
}
