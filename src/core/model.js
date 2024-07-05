const {
  document,
  execute,
  Op,
  literal,
  getSequence,
  UUID,
  EVENT,
  createAudit,
  getAudit,
  search
} = require('./db')
const {
  emailValidator,
  uuidValidate,
  searchText,
  dateTimePattern
} = require('../core/utils')
const logger = require('./logger')
const cluster = require('./cluster')
const moment = require('moment')
const SystemError = require('./SystemError')
moment.locale('pt-br')
moment.tz.setDefault('America/Sao_Paulo')
const { convertToCode } = require('./utils')
const pdf = require('../core/pdf')
const sqlFormatter = require('sql-formatter')

const modelSchema = {}

const getCommandText = (modelName) => {
  const schema = modelSchema[modelName]
  if (!schema) return
  const { name, model } = schema
  if (!name) return
  if (!model) throw new SystemError('Model não implementado.')

  const keys = Object.keys(model)
  if (keys.length === 0) return

  const fieldsData = []
  const fields = []

  const getType = type => {
    switch (type) {
      case String:
        return 'text'
      case Date:
        return 'timestamp with time zone'
      case JSON:
        return 'jsonb'
      case Boolean:
        return 'boolean'
      case Integer:
        return 'integer'
      case Number:
        return 'double precision'
      default:
        if (type instanceof ForeignKey) {
          return 'uuid'
        }
        if (type instanceof Eager || type instanceof Schema || type instanceof Lazy) {
          return 'jsonb'
        }
    }
  }

  keys.forEach(prop => {
    const field = model[prop]
    const type = getType(field.type)
    fieldsData.push(prop)
    fields.push(`(d.data->>'${prop}')::${type} AS "${prop}"\n`)
  })

  const data = fieldsData.map(prop => {
    const field = model[prop]
    const type = getType(field.type)
    return `'${prop}', (d.data->>'${prop}')::${type}`
  }).join('\n,')

  return {
    sql: sqlFormatter.format(`
      SELECT d.id,
          d.type,
          ${fields.join('\n,')},
          jsonb_build_object(${data}) as "data",
          d."tenantId", 
          d."createdAt", 
          d."updatedAt", 
          d."deletedAt"  
      FROM document d
      WHERE d.type::text = '${name}'::text
    `, { language: 'postgresql' }),
    name
  }
}

const errorNumber = async (value, field, inst, label, ctx, msg) => {
  const val = parseFloat(value || '0')
  let { minValue, maxValue } = field
  if (typeof minValue === 'function') {
    minValue = await minValue(self, val, field, inst, ctx, msg)
  }
  if (val < minValue) {
    const msgVal = `O campo ${label} deve ser maior ou igual a ${minValue}.`
    if (!msg.find(message => message === msgVal)) {
      msg.push(msgVal)
    }
    return
  }

  if (typeof maxValue === 'function') {
    maxValue = await maxValue(self, val, field, inst, ctx, msg)
  }
  if (val > maxValue) {
    const msgVal = `O campo ${label} deve ser menor ou igual a ${maxValue}.`
    if (!msg.find(message => message === msgVal)) {
      msg.push(msgVal)
    }
    return
  }
  return val === 0
}
const getErrorValidations = async (value, field, inst, label, ctx, msg) => {
  switch (field.type) {
    case String:
      return (value || '').trim() === ''
    case Date:
      return !value
    case Number:
      return errorNumber(value, field, inst, label, ctx, msg)
    case Object:
      return (!value || Object.keys(value).length === 0)
    case Boolean:
      return false
    default:
      if (field.type instanceof ForeignKey) {
        if (typeof value === 'string') return !uuidValidate(value)
        if (typeof value === 'object' && value?.id) return !uuidValidate(value?.id)
        return true
      }
      return !value
  }
}
const validations = {
  async required (self, value, field, inst, ctx, msg) {
    let { required, label } = field
    if (typeof required === 'function') {
      required = await required({ self, value, field, inst, ctx, msg })
    }
    if (required === true) {
      const error = await getErrorValidations(value, field, inst, label, ctx, msg)
      if (error) {
        const msgVal = `O campo ${label} deve ser informado.`
        if (msg.find(message => message === msgVal)) return
        msg.push(msgVal)
      }
    }
  },
  async isEmail (self, value, field, inst, ctx, msg) {
    const { isEmail } = field
    if (typeof isEmail === 'function') {
      return isEmail({ self, value, field, inst, ctx, msg })
    }
    if (!value) return
    if (isEmail === true && !emailValidator.validate(value)) {
      const mensagem = ['O e-mail']
      if (value) {
        mensagem.push(value)
      }
      mensagem.push('é inválido.')
      const msgVal = mensagem.join(' ')
      if (msg.find(message => message === msgVal)) return
      msg.push(msgVal)
    }
  },
  async unique (self, value, field, inst, ctx, msg) {
    let { unique } = field
    if (typeof unique === 'function') {
      unique = await unique({ self, value, field, inst, ctx, msg })
    }

    if (unique === true) {
      const where = { data: {} }
      where.data[field.name] = value
      const res = await self.findOne({ where }, ctx)
      if (res && res.id !== inst.id) {
        msg.push(`Este ${field.label} já foi cadastrado.`)
      }
    }
  },
  async validate (self, value, field, inst, ctx, msg) {
    if (field.validate) {
      await field.validate({ self, value, field, inst, ctx, msg })
    }
  },
  maxLength (self, value, field, inst, ctx, msg) {
    const { maxLength } = field
    if (maxLength) {
      const len = (value || '').length
      if (len > maxLength) {
        msg.push(`O tamanho do campo ${field.label} está maior que o máximo permitido.`)
      }
    }
  }
}
const pre = async (self, inst, ctx, msg) => {
  const { model } = self.schema
  for await (const fieldName of Object.keys(model)) {
    const field = model[fieldName]
    field.name = fieldName
    const val = inst.data[fieldName]

    if (field.type instanceof Eager) {
      const rows = val || []
      if (rows.length > 0) {
        await rows.forEachAsync(async row => {
          return pre(field.type.model, row, ctx, msg)
        })
      }
      return
    }

    if (field.type instanceof Schema && val) {
      return pre(field.type, val, ctx, msg)
    }

    for await (const prop of Object.keys(field)) {
      const validation = validations[prop]
      if (validation) {
        await validation(self, val, field, inst, ctx, msg)
      }
    }
  }
}
const handlerForeignKey = (current, field, key, val) => {
  if (field.type instanceof ForeignKey) {
    current.data[key] = uuidValidate(val) ? val : val?.id
  }
}
const handlerEager = async (current, field, key, val, ctx) => {
  if (field.type instanceof Eager) {
    if (current.id) {
      current.data[key]?.splice(0)
    }
    await val?.forEachAsync(async (row, index) => {
      current.data[key] = current.data[key] || []
      if (field.type.model.schema.beforeCreateOrUpdate) {
        await field.type.model.schema.beforeCreateOrUpdate(field.type.model, row, ctx)
      }
      current.data[key][index] = await copyData(field.type.model, val[index], row, ctx)
    })
  }
}
const handlerLazy = async (current, field, key, val, ctx) => {
  if (val && field.type instanceof Lazy) {
    const { model, key } = field.type
    const remove = async (ids) => {
      if (ids.length <= 0) return
      const commandText = `delete from document where type = '${model.schema.name}' and id in ('${ids.join(`','`)}')`
      await execute(commandText, ctx)
    }

    const rows = await model.findAll({ where: { data: { [key]: current.id} } }, ctx)
    const oldIds = rows.map((row) => row.id)
    if (val.length === 0 && oldIds.length > 0) {
      return remove(oldIds)
    }

    const ids = val.map((val) => val.id)
    const removeIds = oldIds.filter(id => !ids.includes(id))
    await remove(removeIds)

    for await (const inst of val) {
      inst.data[key] = current
      await model.createOrUpdate(inst, ctx)
    }
  }
}
const handlerSchema = async (current, field, key, val, ctx) => {
  if (field.type instanceof Schema && val) {
    current.data[key] = await copyData(field.type, val, val, ctx)
  }
}
const getValue = async (self, value, inst, autoIncrement, unmask, field, ctx) => {
  if (autoIncrement && inst.inserting) {
    return typeof autoIncrement === 'function'
      ? await autoIncrement(inst, ctx)
      : await getSequence(self.schema.name, ctx)
  }
  if (unmask) {
    return unmask(value, self, inst, ctx)
  }
  if (field.type.prototype?.convert) {
    return field.type.prototype.convert(value)
  }
  return value
}
const copyData = async (self, current, inst, ctx) => {
  for await (const key of Object.keys(self.schema.model)) {
    if (inst.data[key] instanceof Array) {
      inst.data[key] = inst.data[key] || []
    }
    if (!inst.data[key] || (inst.data[key] instanceof Array && inst.data[key].length === 0)) {
      // remove o valor antigo para fazer a cópia do novo valor...
      delete current.data[key]
    }
    const field = self.schema.model[key]
    const { unmask, autoIncrement } = field
    const val = (() => {
      if (field.type === JSON) {
        return inst.data[key]
      }
      if (typeof inst.data[key] === 'boolean') {
        return inst.data[key]
      }
      return inst.data[key] || field.default
    })()
    switch (field.type) {
      case String:
      case Date:
      case JSON:
      case Boolean:
      case Integer:
      case Number:
        current.data[key] = await getValue(self, val, inst, autoIncrement, unmask, field, ctx)
        break
      default:
        handlerForeignKey(current, field, key, val)
        await handlerEager(current, field, key, val, ctx)
        await handlerLazy(current, field, key, val, ctx)
        await handlerSchema(current, field, key, val, ctx)
    }
  }
  delete current.data.audit
  delete current.data.oldInst
  delete inst.data.audit
  delete inst.data.oldInst
  return current
}

function ForeignKey (model) {
  this.model = model
}

function Eager (model) {
  this.model = model
}

function Lazy (model, key) {
  this.model = model
  this.key = key
}

function Integer () {
  console.log('Type Integer')
}

Integer.prototype.convert = (val) => { // nosonar
  if (!val) return
  return parseInt(val)
}
const createOrReplaceViewModel = async (modelName, ctx) => {
  const params = getCommandText(modelName)
  if (!params) return
  const { name, sql } = params
  const commandText = `
  CREATE OR REPLACE VIEW public."${name}" AS
  ${sql}`
  try {
    await execute(commandText, ctx)
  } catch (e) {
    logger.error(e)
  }
}
const createViews = async (name, ctx, force = false) => {
  if (!force && process.env.ENVIRONMENT_PRODUCTION !== 'true') return
  if (name && name !== '*') return createOrReplaceViewModel(name, ctx)
  for await (const schema of Object.keys(modelSchema)) {
    await createOrReplaceViewModel(schema, ctx)
  }
}
const initializeData = async (self, inst, ctx, fks = []) => {
  if (!inst) return

  const initializeForeignKeys = (model, data) => {
    for (const key in model.schema.model) {
      const field = model.schema.model[key]
      const val = data.data[key]

      if (field.type instanceof ForeignKey && uuidValidate(val)) {
        fks.push({ id: val, prop: key })
      }

      if (field.type instanceof Eager) {
        data.data[key] = val || []
        val?.forEach(row => initializeForeignKeys(field.type.model, row))
      }

      if (field.type.constructor.name === 'Schema' && val) {
        initializeForeignKeys(field.type, val)
      }
    }
  }

  initializeForeignKeys(self, inst)

  if (fks.length === 0) return

  const documentIds = fks.map(fk => fk.id)
  const documents = await document.findAll({
    where: { id: documentIds },
    paranoid: false,
    multiTenant: false
  }, ctx)

  if (documents.length === 0) return

  const updateFields = (model, data) => {
    for (const key in model.schema.model) {
      const field = model.schema.model[key]
      const val = data.data[key]

      if (field.type instanceof ForeignKey) {
        data.data[key] = documents.find(d => d.id === val)
      } else if (field.type instanceof Eager) {
        val?.forEach(row => updateFields(field.type.model, row))
      } else if (field.type.constructor.name === 'Schema' && val) {
        updateFields(field.type, val)
      }
    }
  }

  updateFields(self, inst)
}
const updateFieldOptions = async (model) => {
  const { dbTransaction } = require('../core/transaction')
  await dbTransaction(async ctx => {
    const all = await model.findAll({}, ctx)
    await model.schema.VALUE.OPTIONS.forEachAsync(async op => {
      let inst = all.find(a => a.data.value === op.value)
      op.color = op.color || ''
      op.icon = op.icon || ''
      const hasChange = !inst ||
        inst.data.label !== op.label ||
        inst.data.order !== op.order ||
        inst.data.color !== op.color ||
        inst.data.icon !== op.icon

      if (hasChange) {
        inst = inst || { data: op }
        inst.data.label = op.label
        inst.data.order = op.order
        inst.data.color = op.color
        inst.data.icon = op.icon
        if (cluster.isMaster) {
          inst = await model.createOrUpdate(inst, ctx)
        }
      }
      model.schema.ID = model.schema.ID || {}
      Object.keys(model.schema.VALUE).forEach(key => {
        if (model.schema.VALUE[key] === op.value) {
          model.schema.ID[key] = inst.id
        }
      })
    })
  }, {
    api: {
      transaction: 'Update Static Fields'
    }
  })
}
const notify = (params) => {
  const Api = require('./api')
  Api.notify(`/${params.type}/model`, { id: params.id })
}
const registerNotify = (params, ctx) => {
  ctx.afterCommit = ctx.afterCommit || []
  ctx.afterCommit.push({ execute: notify, params })
}
const and = (options) => {
  options.where = options.where || {}
  options.where[Op.and] = options.where[Op.and] || []
  return options.where[Op.and]
}
const initializeWithDefault = (schema, inst) => {
  if (!inst.inserting) return
  Object.keys(schema.model).forEach(key => {
    const field = schema.model[key]
    if (field.type === Number || field.type === Integer) {
      inst.data[key] = inst.data[key] || schema.model[key].default
    }
    if (typeof inst.data[key] !== 'boolean') {
      inst.data[key] = inst.data[key] || schema.model[key].default
    }
  })
}
const toOptions = (val, op, key, filters, calcAlias) => {
  if (val !== undefined) {
    const operator = op.toString().replace(/(Symbol)|(\()|(\))/g, '')
    const operators = {
      in: `in ('${val}')`,
      notIn: `not in('${val}')`,
      not: `<> '${val}'`
    }
    const filtered = operators[operator] || `ilike '${val}'`
    filters.push(`${calcAlias}data->>'${key}' ${filtered}`)
  }
}
const createQuery = (schema, options, ctx) => {
  schema.query = schema.query || function () {
    const { sql } = getCommandText(schema.name)
    return {
      options: {
        alias: 'd',
        searchFields: Object.keys(schema.model).map(field => {
          const prop = schema.model[field]
          return {
            name: `"${field}"`,
            type: prop.type,
            operator: prop.type === Date ? '>=' : 'ilike'
          }
        })
      },
      commandText: `
        WITH doc AS (${sql})
        SELECT * FROM doc d
        WHERE 1=1
        --TENANT--
        --FILTER--
        --ORDERBY--`
    }
  }
  return schema.query(options, ctx)
}
const setWhere = (builder, options) => {
  const { alias } = builder.options || { alias: 'd' }
  if (options.where.id) {
    builder.commandText = builder.commandText.replace(/WHERE 1=1/, `WHERE ${alias}.id in ('${options.where.id.join(`','`)}') (1=1)`)
  }

  const calcAlias = `${alias}.`
  const where = []
  options.where[Op.and] = options.where[Op.and] || []
  const recycling = options.where[Op.and].remove(x => /recyclebin/.test(x?.literal?.val), (item) => {
    const [, value] = item.literal.val.split('=')
    return /sim/i.test(value)
  })

  if (!recycling && !options.recycling) {
    where.push(`${calcAlias}"deletedAt" is null`)
  }

  if (where.length > 0) {
    builder.commandText = builder.commandText.replace(/(1=1)/, `AND (${where.join(' and ')}) (1=1)`)
  }
}
const setTenant = (builder, options) => {
  if (options.multiTenant === false) {
    builder.commandText = builder.commandText.replace(/--TENANT--/, '')
    return
  }
  const { alias } = builder.options
  const calcAlias = alias ? `${alias}.` : ''
  builder.commandText = builder.commandText.replace(/--TENANT--/, `and ${calcAlias}"tenantId" = '--TENANT--'`)
}
const setDefaultFilter = (filters, calcAlias, options) => {
  filters.push(`${calcAlias}"createdAt" >= '${searchText(options.search)}'`)
  filters.push(`${calcAlias}"updatedAt" >= '${searchText(options.search)}'`)
  filters.push(`${calcAlias}"deletedAt" >= '${searchText(options.search)}'`)
}
const setFilterValue = (filters, field, searchVal) => {
  if (typeof field === 'string') {
    filters.push(`${field}::text ilike '%${searchVal}%'`)
  } else {
    const { name, operator } = field
    const percent = operator === 'ilike' ? '%' : ''
    filters.push(`${name}::text ${operator} '${searchVal}${percent}'`)
  }
}
const setFilterOptions = (filters, calcAlias, filter) => {
  Object.entries(Op).forEach(item => {
    const [, op] = item
    const [prop] = Object.keys(filter)
    const val = filter[prop][op]
    toOptions(val, op, prop, filters, calcAlias)
  })
}
const setFilter = (builder, options) => {
  if (!options.where.data) return

  const { alias, searchFields } = builder.options
  const calcAlias = alias ? `${alias}.` : ''

  const filters = []
  options.where.data[Op.or] = options.where.data[Op.or] || []
  if (searchFields && options.search) {
    const searchVal = searchText(options.search).replace(/[*|\s+]/g, '%')
    searchFields.forEach(field => (setFilterValue(filters, field, searchVal)))
  } else {
    options.where.data[Op.or].forEach(filter => (setFilterOptions(filters, calcAlias, filter)))
  }

  if (options.search?.match(dateTimePattern)) {
    setDefaultFilter(filters, calcAlias, options)
  }

  if (filters.length > 0) {
    builder.commandText = builder.commandText.replace(/--FILTER--/, `and (${filters.join(' or ')})`)
  }
}
const setOrderBy = (builder, options) => {
  // Verifica se a string de comando contém a marca "--ORDERBY--".
  if (builder.commandText.includes('--ORDERBY--')) {
    const { defaultSort, order } = options

    // Função para formatar o critério de ordenação.
    const formatOrderBy = (column, descending) => {
      if (column.includes('.')) {
        const [alias, col] = column.split('.')
        return `${alias}."${col}" ${descending}`
      }
      const { alias } = builder.options
      return `${alias}."${column}" ${descending}`
    }

    // Determina o critério de ordenação com base nas opções fornecidas.
    let orderBy = defaultSort ? `"${defaultSort}" ASC` : ''

    if (order && order.length > 0) {
      const [value] = order
      const [col, descending] = value
      orderBy = formatOrderBy(col, descending)
    } else {
      const { orderBy: customOrderBy } = builder.options
      if (customOrderBy) {
        orderBy = customOrderBy
      }
    }

    // Substitui a marca "--ORDERBY--" pelo critério de ordenação formatado.
    builder.commandText = builder.commandText.replace('--ORDERBY--', `ORDER BY ${orderBy || '"createdAt"'}`)
  }
}
const setPagination = (builder, options) => {
  const { limit, offset } = options
  if (limit === '-1') return builder
  const pagination = []
  if (limit) {
    pagination.push(`LIMIT '${limit}'`)
  }
  if (offset) {
    pagination.push(`OFFSET '${offset}'`)
  }
  builder.commandText = `${builder.commandText} ${pagination.join(' ')}`
  return builder
}
const get = async (self, id, multiTenant, ctx) => {
  const options = {
    multiTenant,
    where: {
      type: self.schema.name
    }
  }
  const inst = await document.get(id, options, ctx)
  if (!inst) return
  if (inst.type !== self.schema.name) {
    throw new SystemError('Documento incorreto...')
  }
  inst.data.oldInst = JSON.parse(JSON.stringify(inst))
  await initializeData(self, inst, ctx)
  inst.data.audit = await getAudit(inst, ctx)
  return inst
}
const findOne = async (self, options, ctx) => {
  options.where = options.where || {}
  options.where.type = self.schema.name
  const [inst] = await self.findAll(options, ctx)
  await initializeData(self, inst, ctx)
  return inst
}
const findAll = async (self, options, ctx) => {
  options.where = options.where || {}
  options.where.type = self.schema.name
  return document.findAll(options, ctx)
}
const findAndCount = async (self, options, ctx) => {
  const { defaultSort } = self.schema
  ctx.multiTenant = self.schema.multiTenant
  options.multiTenant = self.schema.multiTenant
  options.where = options.where || {}
  options.defaultSort = defaultSort
  const query = createQuery(self.schema, options, ctx)
  setWhere(query, options)
  setTenant(query, options)
  setFilter(query, options)
  setOrderBy(query, options)
  const [page, rows] = await Promise.all([
    execute(`select count(*) from (${query.commandText}\n) as x`, ctx),
    execute(setPagination(query, options).commandText, ctx)
  ])
  const [sql] = page
  return {
    count: parseInt(sql.count),
    rows
  }
}
const buildSearch = async (schema, inst, ctx) => {
  const keys = Object.keys(schema.model)
  const searchs = []
  for (const key of keys) {
    const attr = schema.model[key]
    if (attr.search === true) {
      searchs.push({
        key,
        value: inst.data[key]
      })
    }
  }

  for await (const s of searchs) {
    await search.createOrUpdate(schema.name, inst.id, s.key, s.value, ctx)
  }
}
const createOrUpdate = async (self, inst, ctx) => {
  const schema = self.schema
  try {
    const inserting = !inst.createdAt
    inst.inserting = inserting
    inst.updating = !inst.inserting
    initializeWithDefault(schema, inst)

    const TriggerModel = require('../application/models/trigger.model')
    const trigger = await TriggerModel.findOne({ where: { data: { name: schema.name } } }, ctx)
    if (trigger?.data?.beforeExecute) {
      const beforeCreateOrUpdate = convertToCode(trigger.data.beforeExecute)
      await beforeCreateOrUpdate(self, inst, ctx)
    }

    let data
    if (schema.beforeCreateOrUpdate) {
      data = await schema.beforeCreateOrUpdate(self, inst, ctx)
      if (data) return data
    }

    const errors = []
    await pre(self, inst, ctx, errors)
    if (errors.length > 0) {
      throw new SystemError(['Veja abaixo o(s) erro(s) encontrado(s).', '<br/>', '<br/>', errors.join('<br/>')].join(''))
    }

    const current = !inserting ? await self.get(inst.id, ctx) : inst
    inst = await copyData(self, current, inst, ctx)
    data = await document.createOrUpdate(schema, inst, ctx)
    data.inserting = inserting
    await initializeData(self, data, ctx)
    if (schema.afterCreateOrUpdate) {
      await schema.afterCreateOrUpdate(self, data, ctx)
    }

    if (trigger?.data?.afterExecute) {
      const afterCreateOrUpdate = convertToCode(trigger.data.afterExecute)
      await afterCreateOrUpdate(self, data, ctx)
    }

    if (!schema.VALUE) {
      registerNotify({ type: schema.name, id: data.id }, ctx)
    }

    ctx.trackChange = ctx.trackChange || {}
    ctx.trackChange.count = ctx.trackChange.count || 0
    ctx.trackChange.count++
    ctx.trackChange.inst = data

    await buildSearch(schema, data, ctx)

    return data
  } catch (e) {
    logger.error(e)
    throw e
  }
}
const reindex = async (name, ctx, force = false) => {}

function Schema (schema) {
  Object.keys(schema.model).forEach(prop => {
    if (/(^id$)|(^type$)|(^createdAt$)|(^updatedAt$)|(^deletedAt$)|(^tenantId$)|(^transactionId$)/gi.test(prop)) {
      throw new Error(`The field "${prop}" of model "${schema.name}" it's a reserved field name of framework...`)
    }
  })

  const self = this
  this.schema = schema
  const multiTenant = Object.hasOwn(schema, 'multiTenant')
    ? schema.multiTenant
    : true

  modelSchema[schema.name] = { ...schema, schema: self }
  this.get = async (id, ctx = {}) => {
    return get(self, id, multiTenant, ctx)
  }
  this.findOne = async (options = {}, ctx = {}) => {
    options.multiTenant = multiTenant
    return findOne(self, options, ctx)
  }
  this.findAll = async (options = {}, ctx = {}) => {
    options.multiTenant = multiTenant
    return findAll(self, options, ctx)
  }
  this.findAndCount = async (options = {}, ctx = {}) => {
    return findAndCount(self, options, ctx)
  }
  this.createOrUpdate = async (inst, ctx) => {
    return createOrUpdate(self, inst, ctx)
  }
  this.create = async (inst, ctx) => {
    if (inst.createdAt) {
      throw new SystemError('Para atualizar um registro utilize o metodo save ou createOrUpdate')
    }
    return self.createOrUpdate(inst, ctx)
  }
  this.save = async (inst, ctx) => {
    if (!inst.createdAt) {
      throw new SystemError('Para criar um novo registro utilize o metodo create ou createOrUpdate')
    }
    return self.createOrUpdate(inst, ctx)
  }
  this.findOrCreate = async (data, ctx) => {
    let inst = await self.findOne({ where: { ...data } }, ctx)
    if (!inst) {
      inst = await self.createOrUpdate(data, ctx)
    }
    return inst
  }
  this.remove = async (id, ctx, options = {}) => {
    const inst = await self.get(id, ctx)
    const executeDelete = async (internalCtx) => {
      if (schema.beforeDelete) {
        await schema.beforeDelete(self, inst, internalCtx)
      }
      const action = inst.deletedAt ? 'restore' : 'destroy'
      const auditInst = await copyData(self, inst, inst, internalCtx)
      await createAudit(auditInst, action === 'destroy' ? EVENT.DELETE : EVENT.RESTORE, internalCtx)

      internalCtx.trackChange = internalCtx.trackChange || {}
      internalCtx.trackChange.count = internalCtx.trackChange.count || 0
      internalCtx.trackChange.count++
      internalCtx.trackChange.inst = inst

      await inst[action]({ transaction: internalCtx.transaction })
      registerNotify({ type: schema.name, id: inst.id }, internalCtx)
    }

    if (!inst.deletedAt && self.schema.constraints) {
      const commandText = []
      for (const constraint of self.schema.constraints()) {
        const { model, pk } = constraint
        commandText.push(`select distinct type from document where type = '${model}' and data @> '{"${pk}": "${id}"}' and "deletedAt" is null and id <> '${id}'`)
      }

      const rows = (await execute(commandText.join('\n union all '), ctx)).map(row => row.type)
      if (rows.length > 0) {
        const msg = []
        rows.forEach(row => msg.push(modelSchema[row].label))
        throw new SystemError(`Você não pode excluir essa entidade. exite(m) vínculo(s) com outra(s) entidade(s) do sistema, veja lista abaixo.<br/><br/> ${msg.join('<br/>')}`)
      }
    }
    return executeDelete(ctx)
  }
  this.print = async (query, ctx) => {
    if (!self.schema.report) {
      const columns = []
      for (const [key, field] of Object.entries(self.schema.model)) {
        if (!(field.type instanceof ForeignKey || field.type instanceof Eager)) {
          columns.push(key)
        }
      }
      columns.push('createdAt')
      columns.push('updatedAt')
      columns.push('deletedAt')
      self.schema.report = {
        pageOrientation: 'landscape',
        columns: [...columns.map(column => {
          const { label } = self.schema.model[column] || {
            createdAt: { label: 'Criado em', type: Date },
            updatedAt: { label: 'Atualizado em', type: Date },
            deletedAt: { label: 'Excluido em', type: Date }
          }[column]
          return { text: label || column, style: 'columnsHeader' }
        })],
        reportData (documents, body) {
          for (const document of documents) {
            const rows = []
            columns.forEach(column => {
              let val = document.data[column] || document[column]
              const field = self.schema.model[column] || {
                createdAt: { type: Date },
                updatedAt: { type: Date },
                deletedAt: { type: Date }
              }[column]
              if (field.type === Date && val) {
                val = moment(val).format('DD/MM/YYYY HH:mm:ss')
              }
              rows.push((val || '').toString())
            })
            body.push(rows)
          }
        }
      }
    }

    const options = {
      multiTenant
    }

    const { reportData, pageOrientation, columns } = self.schema.report

    const result = await findAndCount(self, options, ctx)
    const body = []
    reportData(result.rows, body)
    return pdf.create({
      defaultStyle: { font: 'Helvetica' },
      pageOrientation: pageOrientation || 'portrait',
      content: [
        {
          columns: [
            { text: `${ctx.api.label}\n\n`, style: 'header' }
          ]
        },
        {
          layout: 'noBorders',
          table: {
            body: [[...columns], ...body]
          }
        }
      ],
      styles: {
        header: {
          fontSize: 15,
          bold: true,
          alignment: 'center'
        },
        columnsHeader: {
          fontSize: 10,
          bold: true
        },
        table: {
          alignment: 'center'
        }
      }
    })
  }
  if (schema.VALUE) {
    updateFieldOptions(self).catch(e => logger.error(e))
  }
  return this
}

module.exports = {
  schema: modelSchema,
  Op,
  JSON,
  Date,
  String,
  Number,
  literal,
  Integer,
  execute,
  Boolean,
  createViews,
  and,
  Schema,
  UUID,
  Eager,
  Lazy,
  ForeignKey,
  reindex
}
