const User = require('../models/user.model')
const jwt = require('jsonwebtoken')
const mail = require('../services/mail.service')
const { hash, compare } = require('../../core/bcrypt')
const { getTenantsUser } = require('./tenant.service')
const SystemError = require('../../core/SystemError')
const Role = require('../models/role.model')
const { Op } = require('../../core/model')

const getCode = () => Math.round((Math.random() * 10000) + Number.EPSILON)

const sendMail = async (user, ctx) => {
  return mail.sendMail({
    to: user.data.email,
    subject: 'Redefinição de senha',
    context: {
      template: '/application/auth/register',
      nome: user.data.nome || user.data.email,
      app: `${process.env.ENVIRONMENT_APP} - ${process.env.ENVIRONMENT_DESCRIPTION}`,
      url: `${process.env.ENVIRONMENT_WEB_FRONT_URL}/reset?code=${user.data.code}`
    }
  }, ctx)
}
const generateToken = (user, expiresIn) => {
  return jwt.sign({ id: user.id }, process.env.ENVIRONMENT_AUTH_SECRET, { expiresIn })
}
const reset = async (params, ctx) => {
  const { code, password } = params
  const user = await User.findOne({ where: { data: { code: parseInt(code) } } }, ctx)
  if (user.data.password) throw new SystemError('Sua senha já foi definida. utilize o processode esquecer senha para criar uma nova senha.')
  user.data.password = await hash(password)
  delete user.data.code
  return User.save(user, ctx)
}
const getAcessos = async (user, ctx) => {
  const TenantXUser = require('../models/tenant-user.model')
  const tenants = (await TenantXUser.findAll({ where: { data: { user: user.id } } }, ctx) || []).map(x => x.data.tenant)
  const roles = await Role.findAll({ where: { tenantId: tenants } }, ctx)
  const acessos = []
  roles.forEach(role => {
    const { data } = role
    data.membros = data.membros || []
    data.acessos = data.acessos || []
    if (data.membros.find(membro => membro.data.userId === user.id)) {
      data.acessos.forEach(acesso => {
        const { url, tipo } = acesso.data
        const parts = url.split('/')
        const [, , module, view] = parts
        acessos.push({
          roleId: role.id,
          gruop: module,
          acesso: `/${module}/${view}/view`,
          allow: acesso.data.allow,
          tenantId: role.tenantId,
          tipo,
          url: url.replace(/\/api/, '')
        })
      })
    }
  })
  return acessos.groupBy(x => x.tenantId)
}
const doLogin = async (user, ctx) => {
  return {
    user,
    token: generateToken(user, '1y'),
    tenants: await getTenantsUser(user, ctx),
    acessos: await getAcessos(user, ctx)
  }
}
const login = async (params, ctx) => {
  const { email, password } = params
  const user = await User.findOne({ where: { data: { email } } }, ctx)
  if (!user) throw new SystemError('Usuário não encontrado!')
  if (!user.data.password) throw new SystemError('Você precisa definir sua senha de acesso.')
  const passwordValid = await compare(password || '', user.data.password)
  if (!passwordValid) throw new SystemError('Senha informada é inválida!')
  delete user.data.password
  return doLogin(user, ctx)
}
const register = async (params, ctx, sendInvite = true) => {
  const res = await User.findAll({
    where: {
      data: {
        isSystem: { [Op.not]: true }
      }
    }
  }, ctx)
  const inst = {
    data: {
      ...params.data,
      isAdmin: res.length === 0,
      code: getCode()
    }
  }
  const user = await User.createOrUpdate(inst, ctx)
  if (sendInvite) {
    await sendMail(user, ctx)
  }
  return user
}
const sendEnvite = async (params, ctx) => {
  ctx.force = true
  const { id } = params
  let user = await User.get(id, ctx)
  user.data.code = getCode()
  user = await User.save(user, ctx)
  return sendMail(user, ctx)
}
const setUsetAdmin = async (params, ctx) => {
  const { id, isAdmin } = params
  const user = await User.get(id, ctx)
  user.data.isAdmin = isAdmin
  return User.save(user, ctx)
}
const forgot = async (params, ctx) => {
  const { email } = params
  const user = await User.findOne({ where: { data: { email } } }, ctx)
  if (!user) throw new SystemError('E-mail não encontrado.')
  user.data.code = Math.round((Math.random() * 10000) + Number.EPSILON)
  delete user.data.password
  await sendMail(user, ctx)
  return User.save(user, ctx)
}
const loginByToken = async (params, ctx) => {
  const decode = jwt.decode(params.token)
  const user = await User.get(decode.id, ctx)
  return doLogin(user, ctx)
}
const createUser = async (email, ctx) => {
  const res = await User.findAndCount({
    where: {
      data: {
        isSystem: { [Op.not]: true }
      }
    }
  }, ctx)
  const user = await User.findOne({ where: { data: { email } } }, ctx) || { data: {} }
  user.data.email = email
  if (!user.createdAt) {
    user.data.isAdmin = res.count === 0
  }
  service.doCreateUser(user, ctx)
  return User.createOrUpdate(user, ctx)
}

const gerarTokenAcesso = async (params, ctx) => {
  const { id, expiresIn } = params
  const user = await User.get(id, ctx)
  return generateToken(user, expiresIn)
}

const service = {
  doCreateUser: (inst, ctx) => {},
  register,
  login,
  doLogin,
  reset,
  generateToken,
  sendEnvite,
  setUsetAdmin,
  forgot,
  loginByToken,
  createUser,
  gerarTokenAcesso
}

module.exports = service
