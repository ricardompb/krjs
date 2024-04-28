const Model = require('../../core/model')
const path = require('node:path')
const { mkdir } = require('../services/file.service')
const File = require('../models/file.model')
const moment = require('moment')

module.exports = new Model.Schema({
  name: 'application/tenant',
  label: 'Domínio',
  multiTenant: false,
  GET: { authenticate: '*' },
  model: {
    name: {
      type: Model.String,
      label: 'Nome',
      required: true,
      unique: true
    },
    description: {
      type: Model.String,
      label: 'Descrição'
    },
    logoId: {
      type: new Model.ForeignKey(File),
      label: 'Logo'
    }
  },
  async afterCreateOrUpdate (self, inst, ctx) {
    const User = require('../models/user.model')
    await mkdir(path.join('tenant', inst.id))
    const email = `default@${inst.id.replace(/-/g, '')}.krapp`
    const user = await User.findOne({ where: { data: { email }, tenantId: inst.id } })
    if (user) return
    await User.create({ data: { email, isAdmin: true, isSystem: true }, tenantId: inst.id }, ctx)
  },
  report: {
    pageOrientation: 'landscape',
    columns: [
      { text: 'Nome', style: 'columnsHeader' },
      { text: 'Criado em', style: 'columnsHeader' },
      { text: 'Atualizado em', style: 'columnsHeader' },
      { text: 'Excluido em', style: 'columnsHeader' }
    ],
    reportData (documents, body) {
      for (const document of documents) {
        const rows = []
        rows.push(document.data.name)
        rows.push(moment(document.createdAt).format('DD/MM/YYYY HH:mm:ss'))
        rows.push(moment(document.updatedAt).format('DD/MM/YYYY HH:mm:ss'))
        rows.push(
          document.deletedAt
            ? moment(document.deletedAt).format('DD/MM/YYYY HH:mm:ss')
            : ''
        )
        body.push(rows)
      }
    }
  }
})
