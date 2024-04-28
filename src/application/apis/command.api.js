const Api = require('../../core/api')
const { execute } = require('../services/command.service')

module.exports = new Api.Rest({
  name: 'application/command',
  label: 'Comando',
  POST: {
    execCommand: {
      label: 'Comando',
      async handler (req) {
        return execute(req.body, req.ctx)
      }
    }
  }
})
