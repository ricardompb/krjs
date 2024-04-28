const Api = require('../../core/api')

module.exports = new Api.Rest({
  name: 'application/notification',
  label: 'Notificação',
  POST: {
    webhook: {
      anonymous: true,
      async handler (req) {
        console.log(req.body)
      }
    }
  }
})
