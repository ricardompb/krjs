const Api = require('../../core/api')
const { sendEmailTest } = require('../services/template-text.service')

module.exports = new Api.Rest({
  name: 'application/template-text',
  label: 'Template Text',
  POST: {
    sendMailTest: {
      label: 'Send Email Test',
      async handler (req) {
        return sendEmailTest(req.body, req.ctx)
      }
    }
  }
})
