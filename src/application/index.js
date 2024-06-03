const Api = require('../core/api')
const Scheduler = require('../core/scheduler')
const { mkdir } = require('../application/services/file.service')
const path = require('node:path')

const createDir = async (folders, basePath = '') => {
  for await (const folder of Object.keys(folders)) {
    const pathJoin = path.join(basePath, folder)
    await mkdir(pathJoin)
    if (Object.keys(folders[folder]).length > 0) {
      await createDir(folders[folder], pathJoin)
    }
  }
}

const YES_NO = {
  SIM: 10,
  NAO: 20
}
YES_NO.OPTIONS = [
  { label: 'SIM', value: YES_NO.SIM, order: 1 },
  { label: 'NÃO', value: YES_NO.NAO, order: 2 }
]

let dirname = ''

module.exports = {
  label: 'Aplicativo',
  YES_NO,
  cwd: () => dirname,
  async setup (dir) {
    dirname = dir
    const folders = {
      mail: { success: {}, retry: { 1: {}, 2: {}, 3: {} }, error: {} },
      tenant: {}
    }
    folders.mail.success[new Date().getFullYear()] = {}
    folders.mail.error[new Date().getFullYear()] = {}
    await createDir(folders)
    Scheduler.Register('application/schedulers/mail.scheduler')
    Api.Register('/application/models/user.model')
    Api.Register('/application/models/file.model')
    Api.Register('/application/models/tenant.model')
    Api.Register('/application/models/role.model')
    Api.Register('/application/models/template-text.model')
    Api.Register('/application/models/trigger.model')
    Api.Register('/application/models/yes-no-options.model')
    Api.Register('/application/models/command.model')
    Api.Register('/application/apis/auth.api')
    Api.Register('/application/apis/file.api')
    Api.Register('/application/apis/meta.api')
    Api.Register('/application/apis/tenant.api')
    Api.Register('/application/apis/parameter.api')
    Api.Register('/application/apis/command.api')
    Api.Register('/application/apis/notification.api')
    Api.Register('/application/apis/template-text.api')
    Api.Register('/application/models/logo.model')

    require('./upgrades/dbupgrade').setup()
  }
}
