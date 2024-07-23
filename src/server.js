async function start (basePath) {
  require('./core/utils')
  const logger = require('./core/logger')
  const cluster = require('./core/cluster')
  cluster.setup()
  logger.addCluster(cluster)
  const profiler = logger.startTimer()
  await require('./core/db').connect()
  await require('./core/plugin').setup(basePath)
  require('./core/scheduler').setup()
  await require('./core/api').setup()
  await require('./core/redis').connect()
  if (cluster.isMaster) {
    await require('./core/dbUpgrade').setup()
    profiler.done({ message: 'MASTER READY' })
  } else {
    profiler.done({ message: `SLAVE ${cluster.worker.id}` })
  }
}

module.exports = { start }
