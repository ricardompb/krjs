const Api = require('../api')
const { Op } = require('../model')
const SystemError = require('../SystemError')
const { searchText, uuidValidate } = require('../utils')

const removeQueryAttributes = req => {
  delete req.query.recycling
  delete req.query.paranoid
  delete req.query.search
  delete req.query.offset
  delete req.query.limit
}
const prepareOptions = params => {
  if (params.recycling !== undefined) {
    params.options.paranoid = `${params.recycling}` === 'false'
  }

  if (params.paranoid !== undefined) {
    params.options.paranoid = `${params.paranoid}` === 'true'
  }
}
const prepareWhere = params => {
  let { options, model, rowId, search, advancedSearch } = params
  options.where = options.where || {}
  options.where.type = model.schema.name
  if (rowId && uuidValidate(rowId)) {
    options.where.id = rowId
  }

  if (search) {
    options.where.data = options.where.data || {
      [Op.or]: Object.keys(model.schema.model).map(key => {
        return {
          [key]: { [Op.iLike]: `${searchText(search).replace(/[*|\s+]/g, '%')}%` }
        }
      })
    }
  }

  if (advancedSearch) {
    advancedSearch = decodeURIComponent(advancedSearch)
    advancedSearch = atob(advancedSearch)
    advancedSearch = JSON.parse(advancedSearch)
    const Model = require('../model')
    options.where[Op.and] = options.where[Op.and] || []
    for (const filter of advancedSearch) {
      for (const [column, props] of Object.entries(filter)) {
        const { value, operator } = props
        if (column === 'recyclebin') {
          options.where[Op.and].push({
            literal: Model.literal(`${column}=${value}`)
          })
        } else {
          options.where[Op.and].push({
            literal: Model.literal(`${column} ${operator} '${searchText(value)}'`)
          })
        }
      }
    }
  }
}

module.exports = (model) => {
  const { name, label, isStatic } = model.schema
  const GET = model.schema.GET || {}
  const POST = model.schema.POST || {}
  const PUT = model.schema.PUT || {}
  const DELETE = model.schema.DELETE || {}

  return new Api.Rest({
    name,
    label,
    isStatic: isStatic || false,
    GET: {
      model: {
        authenticate: GET.authenticate,
        label: `${model.schema.label} - Consulta`,
        async handler (req, res) {
          const { id, print } = req.query

          if (print === 'true') {
            const pdf = await model.print(req.query, req.ctx)
            res.end(pdf)
            return
          }

          const data = await (async () => {
            if (id) {
              return model.get(id, req.ctx)
            }

            let { recycling, search, advancedSearch, paranoid, offset, limit, rowId, descending, sortBy } = req.query
            const options = { offset, limit }

            removeQueryAttributes(req)
            prepareOptions({ options, recycling, paranoid })
            prepareWhere({ model, options, rowId, search, advancedSearch })

            if (model.schema.beforeApiGet) {
              await model.schema.beforeApiGet(req, options)
            }

            sortBy = sortBy || 'createdAt'
            descending = descending || 'true'
            const order = [[sortBy, descending === 'true' ? 'DESC' : 'ASC']]

            return model.findAndCount({ order, ...options, search, recycling }, req.ctx)
          })()
          if (model.schema.afterApiGet) {
            await model.schema.afterApiGet(model, data, req.ctx)
          }
          return data
        }
      }
    },
    POST: {
      model: {
        schema: {
          name,
          model: model.schema.model
        },
        authenticate: POST.authenticate,
        label: `${model.schema.label} - Inclusão`,
        transaction: `${model.schema.label} - Inclusão`,
        async handler (req) {
          if (req.body.createdAt) {
            throw new SystemError('Para atualizar um registro utilize o verbo PUT')
          }
          return model.createOrUpdate(req.body, req.ctx)
        }
      }
    },
    PUT: {
      model: {
        schema: {
          name,
          model: {
            id: { type: String, required: true },
            ...model.schema.model,
            createdAt: { type: Date, required: true },
            updatedAt: { type: Date, required: true },
            deletedAt: { type: Date }
          }
        },
        authenticate: PUT.authenticate,
        label: `${model.schema.label} - Alteração`,
        transaction: `${model.schema.label} - Alteração`,
        async handler (req) {
          if (!req.body.createdAt) {
            throw new SystemError('Para criar um novo registro utilize o verbo POST')
          }
          return model.createOrUpdate(req.body, req.ctx)
        }
      }
    },
    DELETE: {
      model: {
        authenticate: DELETE.authenticate,
        label: `${model.schema.label} - Exclusão`,
        transaction: `${model.schema.label} - Exclusão`,
        async handler (req) {
          const { ids } = req.body
          await ids.forEachAsync(async id => {
            await model.remove(id, req.ctx)
          })
        }
      }
    }
  })
}
