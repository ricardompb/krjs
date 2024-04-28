const { sequelize } = require('./db')
const logger = require('./logger')
const SystemError = require('./SystemError')
const Transaction = require('../application/models/transaction.model')

const start = async (ctx) => {
  if (!ctx.api?.transaction) return
  if (ctx.transaction) {
    throw new SystemError('Já existe uma transação ativa')
  }

  ctx.transaction = await sequelize.transaction()
  ctx.beforeCommit = ctx.beforeCommit || []
  ctx.afterCommit = ctx.afterCommit || []

  const { id } = ctx.transaction
  logger.info(`TransactionId: ${id}`)
}
const commit = async (ctx) => {
  if (!ctx.transaction) return
  const { id } = ctx.transaction
  ctx.trackChange = ctx.trackChange || {}
  const { count, inst } = ctx.trackChange
  if (count > 0) {
    const transaction = await Transaction.create({
      id,
      data: {
        description: ctx.api.transaction,
        userId: ctx.user
      }
    }, ctx)
    inst.transactionId = transaction.id
    await inst.save({ transaction: ctx.transaction })
  }

  await ctx.transaction.commit()
  ctx.afterCommit.forEachAsync(action => {
    action.execute(action.params)
  }).catch(e => (logger.error(e)))
  delete ctx.transaction
}
const rollback = async (ctx) => {
  if (!ctx.transaction) return
  await ctx.transaction.rollback()
  delete ctx.transaction
}

const dbTransaction = async (cb, ctx = {}) => {
  await start(ctx)
  try {
    const data = await cb(ctx)
    await commit(ctx)
    return data
  } catch (e) {
    logger.error(e)
    await rollback(ctx)
  }
}

module.exports = {
  start,
  commit,
  rollback,
  dbTransaction
}
