const Api = require('../../core/api')
const { reqToFile } = require('../services/file.service')

module.exports = new Api.Rest({
  name: 'application/file',
  label: 'Arquivo',
  POST: {
    upload: {
      uploader: true,
      label: 'Upload',
      transaction: 'Convert File to FileModel',
      async handler (req) {
        return reqToFile(req)
      }
    }
  }
})
