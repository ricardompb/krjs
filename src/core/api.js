const logger = require('./logger')
const express = require('express')
const cookieParser = require('cookie-parser')
const app = express()
const http = require('node:http')
const server = http.createServer(app)
const cluster = require('../core/cluster')
const User = require('../application/models/user.model')
const jwt = require('jsonwebtoken')
const { dbTransaction } = require('./transaction')
const { uuidValidate, uuid, convertToCode, unmask } = require('./utils')
const multer = require('multer')
const FileService = require('../application/services/file.service')
const TriggerModel = require('../application/models/trigger.model')
const swagger = require('./swagger')
const Metrics = require('./metrics')

const origin = process.env.ENVIRONMENT_WEB_CORS
  ? JSON.parse(process.env.ENVIRONMENT_WEB_CORS)
  : process.env.ENVIRONMENT_WEB_URL

const cors = require('cors')({ origin })

app.use(cors)
app.use('/files', cors, async (req, res, next) => {
  return next()
})

const filesDir = process.env.ENVIRONMENT_FILES

const statics = express.static(filesDir, {
  maxAge: 31536000,
  cacheControl: 'no-cache',
  immutable: true
})

app.use('/files', statics)

const { Server } = require('socket.io')
const io = new Server(server, {
  transports: ['websocket'],
  cors: {
    origin: process.env.ENVIRONMENT_WEB_URL,
    credentials: true
  },
  allowEIO3: true
})

const clients = {}

io.on('connection', (socket) => {
  logger.info(`Client ConnectId: ${socket.id}`)
  clients[socket.id] = { socket }
  socket.on('disconnect', () => {
    logger.debug(`Client DisconnectId: ${socket.id}`)
    delete clients[socket.id]
  })
})

const notify = (event, param, execute) => {
  if (cluster.active && !execute) {
    return cluster.broadcast('krapp.api/notify/socket.io', { event, param })
  }

  Object.keys(clients)
    .forEachAsyncParallel(key => {
      const client = clients[key]
      client.socket.emit(event, param)
    })
    .catch(logger.error)
}

const limit = process.env.ENVIRONMENT_API_LIMIT || '50mb'

app.use(express.json({ limit }))
app.use(cookieParser())
app.use(express.urlencoded({ limit, extended: false }))

const apiConfig = {
  GET: {},
  POST: {},
  PUT: {},
  DELETE: {}
}
const endPoints = {}

const { STATUS_CODE } = require('../core')

const STATUS_CODE_BY_METHOD = {
  PUT: STATUS_CODE.Ok,
  POST: STATUS_CODE.Created
}

Metrics.Gauge({
  name: 'krapp_request_api',
  help: 'Quantidade de requisições na api',
  labelNames: ['dummy']
})

app.use((req, res, next) => {
  Metrics.krapp_request_api.inc({ dummy: 0 })
  res.header('Access-Control-Allow-Methods', 'PUT, DELETE')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  next()
})

const router = express.Router()

router.use((req, res, next) => {
  if (req.method !== 'OPTIONS') {
    const profiler = logger.startTimer()
    res.on('finish', () => {
      const { ctx } = req
      if (!ctx) return
      const { user } = ctx
      const { statusCode, method, originalUrl } = req
      const parts = []
      parts.push(statusCode)
      parts.push(method)
      parts.push(originalUrl)
      parts.push(user ? `user=${user.data.email}` : '')
      profiler.done({ message: parts.join(' ') })
    })
  }
  next()
})

router.use(async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next()
  }

  const method = apiConfig[req.method]
  const [path] = req.originalUrl.split('?')
  const api = method[path]

  if (!api?.handler) {
    return res.status(STATUS_CODE.Not_Found).send()
  }

  req.ctx = {
    api,
    for: req.query?.for || '',
    method: req.method,
    canCreateAudit: true
  }

  return next()
})

router.use(async (req, res, next) => {
  const { ctx } = req
  const { anonymous, authenticate, isStatic } = ctx.api
  if ([anonymous, isStatic].includes(true)) {
    ctx.tenant = req.headers.tenant || req.cookies.tenant || krapp.DEFAULT_TENANT_ID
    return next()
  }

  const { authorization, tenant } = (() => {
    const authorization = req.headers.authorization || req.cookies.Authorization
    const tenant = req.headers.tenant || req.cookies.tenant || krapp.DEFAULT_TENANT_ID
    return {
      authorization,
      tenant
    }
  })()
  const [bearer, token] = (authorization || '').split(' ')

  if (!/Bearer/.test(bearer)) {
    return res.status(STATUS_CODE.Bad_Request).send({ message: 'Tipo de token esperado não informado...', error: true })
  }

  let decode
  try {
    decode = jwt.verify(token, process.env.ENVIRONMENT_AUTH_SECRET)
  } catch (e) {
    return res.status(STATUS_CODE.UnAuthorized).send({ message: e.message, error: true })
  }

  if (!tenant) {
    return res.status(STATUS_CODE.Bad_Request).send({ message: 'Você precisa selecionar um domínio...', error: true })
  }

  const Tenant = require('../application/models/tenant.model')
  const tenantActive = await Tenant.get(tenant, ctx)
  if (!tenantActive) {
    return res.status(STATUS_CODE.Bad_Request).send({
      message: 'Seu domínio não encontra-se ativo no sistema. Contate o administrador!',
      error: true
    })
  }

  ctx.tenant = uuidValidate(tenant) ? tenant : null
  ctx.user = await User.get(decode.id, {})

  if (ctx.user.data.isAdmin) return next() // administrador tem acesso a tudo
  if (authenticate === '*') {
    return next()
  }

  const has = await hasAccess(req, ctx)
  if (!has) {
    return res.status(STATUS_CODE.Forbidden).send({ message: 'Atenção... Você não tem permissão para executar essa ação! Contate o administrador do Sistema.' })
  }

  return next()
})

const hasAccess = async (req, ctx) => {
  const Role = require('../application/models/role.model')
  const roles = await Role.findAll({}, ctx)
  const acessos = []
  roles.forEach(({ data }) => {
    data.membros = data.membros || []
    data.acessos = data.acessos || []
    if (data.membros.find(membro => membro.data.userId === ctx.user.id)) {
      const [url] = req.url.split('?')
      const acesso = data.acessos.find(acesso => acesso.data.url === `/api${url}` && acesso.data.tipo === req.method)
      if (acesso) {
        acessos.push(acesso)
      }
    }
  })
  return !!acessos.find(acesso => acesso.data.allow === true)
}

router.use(async (req, res, next) => {
  const { ctx } = req
  const { api } = ctx
  const { uploader } = api
  if (uploader === true) {
    const storage = multer.diskStorage({ // nosonar
      destination: async function (req, file, cb) {
        const [destination, multiTenant] = req.headers.destination.split('?')
        const [, isMultiTenant] = multiTenant.split('=')
        const parts = []
        if (isMultiTenant === 'true') {
          parts.push('tenant')
          parts.push(req.headers.tenant)
        }
        parts.push(destination)
        cb(null, await FileService.mkdir(parts.join('/')))
      },
      filename: function (req, file, cb) {
        const originalname = ['krapp', uuid.v1().replace(/-/g, ''), file.originalname]
        cb(null, originalname.join('-'))
      }
    })

    const fileSize = parseInt(unmask(process.env.ENVIRONMENT_API_LIMIT || '10'))
    const upload = multer({
      limits: {
        fileSize: fileSize * 1024 * 1024
      },
      storage
    })

    return upload.single('upload')(req, res, err => {
      if (err) {
        logger.error(err)
        return
      }
      next()
    })
  }
  return next()
})

const executeHandler = async (req, res) => {
  try {
    const trigger = await TriggerModel.findOne({ where: { data: { name: req.ctx.api.path } } }, req.ctx)
    if (trigger?.data?.beforeExecute) {
      const beforeExecute = convertToCode(trigger.data.beforeExecute)
      await beforeExecute(req, res)
      if (res.finished === true) return
    }

    const data = await req.ctx.api.handler(req, res)

    if (trigger?.data?.afterExecute) {
      const afterExecute = convertToCode(trigger.data.afterExecute)
      await afterExecute(req, res)
      if (res.finished === true) return
    }

    const statusCode = (() => {
      if (!data || data?.rows?.length === 0) {
        return STATUS_CODE.NoContent
      }
      return STATUS_CODE_BY_METHOD[req.method] || STATUS_CODE.Ok
    })()

    if (res.finished === true) return
    res.status(statusCode).json(data)
    return data
  } catch (e) {
    logger.error(e)
    res.status(STATUS_CODE.Not_Found).json({ message: e.message, error: true })
    throw e
  }
}

const handler = async (req, res) => {
  if (!req.ctx.api.transaction) {
    return executeHandler(req, res)
  }

  return dbTransaction(async () => {
    return executeHandler(req, res)
  }, req.ctx)
}

router.get('/:module/:class/:method', handler)
router.post('/:module/:class/:method', handler)
router.put('/:module/:class/:method', handler)
router.delete('/:module/:class/:method', handler)

app.use('/api', router)

const Register = (filename) => {
  const api = (() => {
    if (typeof filename === 'object') {
      return filename
    }

    const sufix = (() => {
      if (filename.match(/(\.model$)|(\.api$)/)) return ''
      return filename.match(/models/)
        ? '.model'
        : '.api'
    })()

    const path = require('node:path')
    const appDir = path.dirname(require.main.filename)
    const baseDir = /^(\/)?(application|endereco)/.test(filename) ? '../' : appDir
    const api = require(`${baseDir}/${filename}${sufix}`)
    if (/models/.test(filename)) {
      return require('./apis/model.api')(api)
    }
    return api
  })()

  Object.keys(apiConfig).forEach(verb => {
    if (api.config[verb]) {
      Object.keys(api.config[verb]).forEach(method => {
        const path = `/api/${api.config.name}/${method}`
        const cfg = api.config[verb][method]
        endPoints[`${verb}${path}`] = {
          label: cfg.label || cfg.name
        }
        apiConfig[verb][path] = {
          api,
          path,
          ...cfg,
          name: api.config.name,
          label: api.config.label,
          method: verb,
          isStatic: api.config.isStatic || false
        }
        logger.verbose(`${verb}:${api.config.name}/${method}`)
      })
    }
  })
}

cluster.on('krapp.api/notify/socket.io', ({ msg }) => {
  notify(msg.event, msg.param, true)
})

module.exports = {
  notify,
  Register,
  config: apiConfig,
  endPoints,
  Rest: function (config) {
    this.config = config
  },
  async setup () {
    if (process.env.ENVIRONMENT_CLUSTER !== 'true' || !cluster.isMaster) {
      server.listen(process.env.ENVIRONMENT_API_PORT, () => {
        logger.info(`SERVER RUNNING PORT ${process.env.ENVIRONMENT_API_PORT}`)
      })
    }
    swagger.setup(apiConfig, app)
  }
}
