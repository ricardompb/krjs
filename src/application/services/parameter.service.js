const Parameter = require('../models/parameter.model')
const Model = require('../../core/model')
const { Op, literal } = Model
const db = require('../../core/db')

const getParameter = async (name, ctx) => {
  return Parameter.findOne({ where: { data: { name } } }, ctx)
}
const setValue = async (name, value, ctx) => {
  const parameter = await getParameter(name, ctx)
  parameter.data.value = value
  return Parameter.save(parameter, ctx)
}
const createComponent = async (params, ctx) => {
  const { name } = params
  const parameter = (await getParameter(name, ctx)) || { data: {} }
  const value = parameter.data.value
  parameter.data = { ...params }
  parameter.data.value = parameter.data.value || value
  return Parameter.createOrUpdate(parameter, ctx)
}
const updateParameters = async (params, ctx) => {
  await params.forEachAsync(async param => {
    const parameter = await Parameter.get(param.id, ctx)
    if (parameter.data.value !== param.value) {
      parameter.data.value = (() => {
        if (parameter.data.component === 'kr-input-lookup' && param.value && param.value.id) {
          if (param.value.id) {
            return param.value.id
          }
        }
        return param.value
      })()
      await Parameter.save(parameter, ctx)
    }
  })
  return getAllParameters(ctx)
}
const getAllParameters = async (ctx) => {
  const allLookups = await Parameter.findAll({
    where: {
      data: {
        component: 'kr-input-lookup',
        value: { [Op.not]: null }
      }
    }
  }, ctx)
  const order = [['createdAt', 'DESC'], [literal('data->>\'group\''), 'DESC']]
  const parameters = await Parameter.findAll({ order }, ctx)
  if (allLookups.length > 0) {
    const ids = allLookups.map(lookup => {
      const { data } = lookup
      return data.value
    })
    const rows = await db.document.findAll({ attributes: ['id', 'type'], where: { id: ids } })
    await ids.forEachAsync(async id => {
      const row = rows.find(x => x.id === id)
      const { type } = row
      const lookups = await Model.schema[type].schema.findAndCount({ where: { id: [row.id] } }, ctx)
      lookups.rows.forEach(lookup => {
        const parameter = parameters.find(parameter => {
          const { data } = parameter
          return data.value === lookup.id
        })
        if (parameter) {
          parameter.data.value = lookup
        }
      })
    })
  }
  const rows = parameters.groupBy(x => x.data.tab)
  const keys = Object.keys(rows)
  keys.forEach(key => (rows[key] = rows[key].groupBy(x => x.data.group)))
  return rows
}

module.exports = {
  getParameter,
  setValue,
  createComponent,
  updateParameters,
  getAllParameters
}
