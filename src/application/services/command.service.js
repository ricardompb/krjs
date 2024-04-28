const Command = require('../models/command.model')
const Api = require('../../core/api')

const service = {
  execute: async (params, ctx) => {
    const command = await Command.get(params.id, ctx)
    delete params.id
    const api = Api.config[command.data.verb.toUpperCase()][`/api${command.data.url}`]
    return api?.handler({
      body: { ...params },
      ctx
    })
  }
}

module.exports = service
