const logger = require('../core/logger')
const plugins = JSON.parse(process.env.PLUGINS)

module.exports = {
  async setup (dir) {
    await plugins.forEachAsync(async key => {
      const baseDir = /^(\/)?(application|endereco)/.test(key) ? '../' : dir
      const plugin = require(`${baseDir}/${key}`)
      if (plugin?.setup) {
        logger.info(`plugin: ${plugin.label || key}`)
        await plugin.setup(baseDir)
      }
    })
  }
}
