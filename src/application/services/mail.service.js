const { writeFile } = require('./file.service')
const { uuid } = require('../../core/utils')
const path = require('node:path')
const getFilename = (data, ext) => [...data, '.', ext].join('')
module.exports = {
  getFilename,
  async sendMail (data, ctx) {
    const filename = getFilename(['mail-', uuid.v1()], 'json')
    data.tenantId = ctx.tenant
    return writeFile(path.join('mail', filename), JSON.stringify(data))
  }
}
