const handlebars = require('handlebars')
const puppeteer = require('puppeteer')

const TemplateTextModel = require('../models/template-text.model')
const { sendMail } = require('./mail.service')

const htmlBase = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link href="{{{bootstrap}}}" rel="stylesheet" integrity="sha384-KK94CHFLLe+nY2dmCWGMq91rCGa5gtU4mk92HdvYe+M/SXH301p5ILy+dN9+nJOZ" crossorigin="anonymous">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  --CONTENT--
</body>
</html>`

const compile = async (context, ctx = {}) => {
  const { template, params, tenantId, whatsapp } = context
  delete context.template
  delete context.tenantId
  ctx.tenant = tenantId
  const templateText = await TemplateTextModel.findOne({ where: { data: { url: template } } }, ctx)
  if (templateText?.data) {
    params.bootstrap = templateText.data.bootstrap
    if (whatsapp) {
      return handlebars.compile(templateText.data.content)(params)
    }
    return handlebars.compile(htmlBase.replace(/--CONTENT--/, templateText.data.content))(params)
  }
  return require(`../..${template}`)(params)
}

const generatePdf = async (content) => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
    headless: 'new'
  })
  const page = await browser.newPage()
  await page.setContent(content)
  await page.emulateMediaType('screen')
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true
  })
  await browser.close()
  return pdf
}

const sendEmailTest = async (params, ctx) => {
  const { destinatarios, id } = params
  const templateText = await TemplateTextModel.get(id, ctx)
  for await (const destinatario of destinatarios) {
    await sendMail({
      to: destinatario.data.email,
      subject: 'Teste',
      text: templateText.data.content
    }, ctx)
  }
}

module.exports = {
  compile,
  generatePdf,
  sendEmailTest
}
