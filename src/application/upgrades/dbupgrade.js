const dbUpgrade = require('../../core/dbUpgrade')
const { createComponent, setValue } = require('../services/parameter.service')
const TemplateTextModel = require('../models/template-text.model')
const Model = require('../../core/model')
const fs = require('node:fs/promises')
const { cwd } = require('../../application')
const path = require('node:path')

module.exports = {
  setup () {
    dbUpgrade.Register({
      id: 'f5aa1236-bd37-4d4e-ba70-05fbf5d3bf23',
      runningAllTenant: true,
      async execute (ctx) {
        await createComponent({ tab: 'Geral', group: 'E-mail', component: 'kr-input-text', name: 'EMAIL_FROM', label: 'De' }, ctx)
        await createComponent({ tab: 'Geral', group: 'E-mail', component: 'kr-input-text', name: 'EMAIL_HOST', label: 'Hostname' }, ctx)
        await createComponent({ tab: 'Geral', group: 'E-mail', component: 'kr-input-number', name: 'EMAIL_PORT', label: 'Porta', options: { options: { decimal: '', thousands: '', precision: 0 } } }, ctx)
        await createComponent({ tab: 'Geral', group: 'E-mail', component: 'q-toggle', name: 'EMAIL_SECURE', label: 'Autenticação segura?' }, ctx)
        await createComponent({ tab: 'Geral', group: 'E-mail', component: 'kr-input-text', name: 'EMAIL_USER', label: 'Usuário' }, ctx)
        await createComponent({ tab: 'Geral', group: 'E-mail', component: 'kr-input-password', name: 'EMAIL_PASS', label: 'Senha' }, ctx)
        await setValue('EMAIL_FROM', 'Noreply <noreply@krinfo.com.br>', ctx)
        await setValue('EMAIL_HOST', 'smtp.hostinger.com', ctx)
        await setValue('EMAIL_PORT', 465, ctx)
        await setValue('EMAIL_SECURE', true, ctx)
        await setValue('EMAIL_USER', 'noreply@krinfo.com.br', ctx)
        await setValue('EMAIL_PASS', '@Krinfo23*', ctx)
      }
    })

    dbUpgrade.Register({
      id: 'dbb37bd0-3d8a-498a-8239-e801a85785de',
      runningAllTenant: true,
      async execute (ctx) {
        const commandText = `delete from document where type = 'application/template-text' and "tenantId" = '${ctx.tenant}'`
        await Model.execute(commandText, ctx)
        const filename = path.join(cwd(), 'application', 'resources', 'reset.handlebars')
        const content = await fs.readFile(filename, { encoding: null })
        await TemplateTextModel.create({
          data: {
            name: 'Resetar Senha do Usuário',
            url: '/application/auth/register',
            content: content.toString(),
            bootstrap: 'N/A',
            isSystem: true
          }
        }, ctx)
      }
    })
  }
}
