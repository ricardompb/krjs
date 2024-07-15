const Logger = require('./logger')
const Cluster = require('./cluster')
const cron = require('node-cron')
const schedulers = []

module.exports = {
  Register: function (filename) {
    if (Cluster.active && !Cluster.isMaster) return
    const sufix = filename.match(/\.scheduler/) ? '' : '.scheduler'
    const scheduler = require(`../${filename}${sufix}`)
    if (scheduler) {
      schedulers.push(scheduler)
    }
  },
  setup () {
    if (Cluster.active && !Cluster.isMaster) return
    schedulers.forEach(scheduler => {
      const { execute, interval, name, label } = scheduler
      const info = label ? `${label} - ${name}` : name
      Logger.info(`Scheduler: ${info}`)
      cron.schedule(interval, execute, {
        scheduled: true,
        timezone: 'America/Sao_Paulo'
      })
    })
  }
}
