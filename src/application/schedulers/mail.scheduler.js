const NodeMailer = require('nodemailer')
const { readFiles, moveFile, readFile, writeFile } = require('../services/file.service')
const { compile } = require('../services/template-text.service')
const { decrypt, encrypt } = require('../../core/bcrypt')
const Parametro = require('../models/parameter.model')
const Logger = require('../../core/logger')
const Path = require('node:path')
const moment = require('moment')
const running = []

module.exports = {
  name: 'SendMail',
  label: 'Fila de envio de e-mail',
  interval: '* * * * *',
  async execute (ctx) {
    const year = new Date().getFullYear()
    const files = [...new Set(await readFiles('mail'))]
    if (files.length > 0) {
      await files.forEachAsyncParallel(async filename => {
        if (running.includes(filename)) return
        running.push(filename)
        const profile = Logger.startTimer()
        try {
          const file = await readFile(Path.join('mail', filename))
          const content = JSON.parse(file.toString())
          const { to, subject, context, text, tenantId, cfg } = content
          const html = await (() => {
            if (cfg) return content.body
            if (!context) return text
            const { template } = context
            delete context.template
            return compile({
              template,
              params: { ...context },
              tenantId
            })
          })()

          const [from, host, port, secure, user, pass] = await (async () => {
            if (cfg) {
              const { from, host, port, user, pass } = cfg

              return [
                { data: { value: from } },
                { data: { value: host } },
                { data: { value: port } },
                { data: { value: false } },
                { data: { value: user } },
                { data: { value: encrypt(pass) } }
              ]
            }
            return await Promise.all([
              Parametro.findOne({ where: { data: { name: 'EMAIL_FROM' } } }, {}),
              Parametro.findOne({ where: { data: { name: 'EMAIL_HOST' } } }, {}),
              Parametro.findOne({ where: { data: { name: 'EMAIL_PORT' } } }, {}),
              Parametro.findOne({ where: { data: { name: 'EMAIL_SECURE' } } }, {}),
              Parametro.findOne({ where: { data: { name: 'EMAIL_USER' } } }, {}),
              Parametro.findOne({ where: { data: { name: 'EMAIL_PASS' } } }, {})
            ])
          })()

          if (!host?.data) return

          const mail = {
            host: host.data.value,
            port: parseInt(port.data.value),
            secure: secure.data.value,
            auth: {
              user: user.data.value,
              pass: decrypt(pass.data.value)
            },
            tls: {
              rejectUnauthorized: false
            }
          }

          const toFormat = (() => {
            if (typeof to === 'object') {
              return to.map(x => {
                const { name, recipient } = x.data
                return {
                  name,
                  address: recipient
                }
              })
            }
            return to
          })()

          const transport = NodeMailer.createTransport(mail) // NOSONAR
          await transport.sendMail({ from: from.data.value, to: toFormat, subject, html })

          Logger.info(`E-mail enviado para "${to}" dia ${moment(new Date()).format('DD/MM/YYYY [às] HH:mm:ss')}`)
          await moveFile(filename, 'mail', Path.join('success', `${year}`))
        } catch (e) {
          Logger.error(e)
          await writeFile(
            Path.join('mail', 'error', `${year}`, `${filename.replace(/\.json/, '.json.err')}`),
            e.stack || e.message
          )
          await moveFile(filename, 'mail', Path.join('error', `${year}`))
        }
        profile.done({ message: 'Envio de e-mail' })
      })
    }
  }
}
