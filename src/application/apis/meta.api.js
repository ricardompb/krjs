const Api = require('../../core/api')
const Model = require('../../core/model')
const logger = require('../../core/logger')

module.exports = new Api.Rest({
  name: 'application/meta',
  label: 'Metadados',
  GET: {
    options: {
      anonymous: true,
      async handler (req) {
        const options = {}
        await Object.keys(Model.schema).forEachAsync(async key => {
          const model = Model.schema[key]
          if (model.VALUE) {
            options[model.name] = options[model.name] || []
            const data = await model.schema.findAll({}, req.ctx)
            options[model.name].push(...data.map(d => {
              return {
                ...d.data,
                value: d
              }
            }))
          }
        })
        return options
      }
    },
    apis: {
      anonymous: true,
      async handler () {
        return Api.endPoints
      }
    },
    schemas: {
      anonymous: true,
      async handler () {
        const hasLabel = (schema) => {
          if (schema.VALUE) return false
          return !!schema.label
        }

        const entity = Object.keys(Model.schema).map(item => {
          const schema = Model.schema[item]
          return {
            value: schema.name,
            label: schema.label,
            VALUE: schema.VALUE
          }
        })

        const process = []
        Object.keys(Api.config).forEach(verb => {
          const endPoints = Api.config[verb]
          Object.keys(endPoints).forEach(epn => {
            if (/model/.test(epn)) return
            const name = epn.split('/').pop()
            const endPoint = endPoints[epn]
            const { anonymous, label } = endPoint.api.config[endPoint.method][name]
            if (anonymous === true) return
            process.push({ value: epn, label })
          })
        })

        return {
          entity: entity.filter(hasLabel),
          process: process.filter(hasLabel)
        }
      }
    },
    logoUrl: {
      authenticate: '*',
      label: 'Obter url do logo',
      handler: async (req, res) => {
        const Logo = require('../models/logo.model')
        const logo = await Logo.findOne({ where: { tenantId: req.ctx.tenant } }, req.ctx)
        if (!logo) return ''
        return `${process.env.ENVIRONMENT_WEB_URL}/files/${logo.data.fileId.data.destination}/${logo.data.fileId.data.filename}`
      }
    },
    logo: {
      label: 'Obter logo',
      authenticate: '*',
      handler: async (req, res) => {
        const Logo = require('../models/logo.model')
        const logo = await Logo.findOne({ where: { tenantId: req.ctx.tenant } }, req.ctx)
        return logo || { data: {} }
      }
    }
  },
  POST: {
    sql: {
      label: 'Executa consulta no banco de dados',
      authenticate: '*',
      async handler (req) {
        return Model.execute(req.body.commandText, req.ctx)
      }
    },
    'create-or-update-view': {
      label: 'Cria ou atualiza a view',
      authenticate: '*',
      transaction: 'Create Or Update View',
      async handler (req) {
        const { name } = req.body
        try {
          return Model.createViews(name, req.ctx, true)
        } catch (e) {
          logger.error(e)
        }
      }
    },
    uploadLogo: {
      authenticate: '*',
      uploader: true,
      label: 'Upload da logomarca',
      transaction: 'Upload da logomarca',
      handler: async (req, res) => {
        const Logo = require('../models/logo.model')
        const { reqToFile } = require('../services/file.service')
        const file = await reqToFile(req)
        let logo = await Logo.findOne({ where: { tenantId: req.ctx.tenant } }, req.ctx) || { data: {} }
        logo.data.fileId = file
        logo = await Logo.createOrUpdate(logo, req.ctx)
        return logo.data.fileId
      }
    },
    reindex: {
      label: 'Reindexar pesquisas do sistema',
      authenticate: '*',
      transaction: 'Reindexar pesquisas do sistema',
      async handler (req) {
        const { name } = req.body
        try {
          return Model.reindex(name, req.ctx)
        } catch (e) {
          logger.error(e)
        }
      }
    }
  }
})
