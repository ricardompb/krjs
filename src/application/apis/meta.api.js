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
            options[model.name] = options[model.schema.name] || []
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
    }
  }
})
