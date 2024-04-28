const cluster = require('node:cluster')
const onCallBacks = {}
const workers = {}
const clusterIsMaster = () => cluster.isMaster || !process.env.ENVIRONMENT_CLUSTER
const clusterWorker = () => process.env.ENVIRONMENT_CLUSTER === 'true' ? cluster.worker : null
const on = (event, cb) => (onCallBacks[event] = cb)
const broadcast = (event, msg) => {
  if (!process?.send) return
  process.send({ event, msg })
}
const onMessage = (message) => {
  const { event } = message
  const cb = onCallBacks[event]
  if (cb) {
    cb(message)
  }
}
const setup = () => {
  if (process.env.ENVIRONMENT_PRODUCTION !== 'true') return
  if (process.env.ENVIRONMENT_CLUSTER === 'true') {
    const cpus = process.env.ENVIRONMENT_CLUSTER_POOL_SIZE || require('node:os').cpus().length
    const { isMaster, fork } = cluster
    if (isMaster) {
      for (let i = 0; i < cpus; i++) {
        const worker = fork()
        workers[worker.id] = worker
        worker.on('message', message => {
          onMessage(message)
          for (const key in workers) {
            workers[key].send(message)
          }
        })
      }
    } else {
      process.on('message', message => onMessage(message))
    }
  }
}

module.exports = {
  setup,
  active: process.env.ENVIRONMENT_CLUSTER === 'true',
  on,
  broadcast,
  isMaster: clusterIsMaster(),
  workerId: clusterIsMaster() ? 'M' : `S${clusterWorker().id}`,
  worker: clusterWorker()
}
