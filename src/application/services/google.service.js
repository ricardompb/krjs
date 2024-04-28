const axios = require('axios')
const SystemError = require('../../core/SystemError')
const logger = require('../../core/logger')
const jwt = require('jsonwebtoken')
const User = require('../models/user.model')
const { generateToken, createUser } = require('../services/auth.service')
const { uuid } = require('../../core/utils')
const fileService = require('./file.service')

const getAccessToken = async (code) => {
  const res = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: process.env.PLUGINS_APPLICATION_SOCIAL_GOOGLE_CLIENT_ID,
    client_secret: process.env.PLUGINS_APPLICATION_SOCIAL_GOOGLE_CLIENT_SECRET,
    redirect_uri: `${process.env.ENVIRONMENT_WEB_URL}${process.env.PLUGINS_APPLICATION_SOCIAL_GOOGLE_REDIRECT_URI}`,
    grant_type: 'authorization_code'
  })

  if (res.status !== 200) {
    throw new SystemError(`status ${res.status}`)
  }

  const body = res.data
  const { access_token, id_token } = body
  if (!access_token) {
    throw new SystemError(JSON.stringify(body))
  }

  return {
    accessToken: access_token,
    idToken: id_token
  }
}

const login = async (req, res) => {
  if (!process.env.PLUGINS_APPLICATION_SOCIAL_GOOGLE_CLIENT_ID) {
    return res.status(404).send()
  }

  const { error, code } = req.query
  if (error) {
    logger.warn(`auth-google error ${JSON.stringify(error)}`)
    return res.redirect(`${process.env.ENVIRONMENT_WEB_FRONT_URL}/login`)
  }

  if (!code) {
    throw new SystemError('"code" não informado')
  }

  const { idToken } = await getAccessToken(code)
  const user = jwt.decode(idToken)
  if (!user) {
    throw new SystemError('Não foi possível obter informações da conta do Google.')
  }

  if (!user.email) {
    throw new SystemError('Não há email configurado na conta do Google.')
  }

  req.ctx.custom = req.ctx.custom || {}
  req.ctx.custom.ignoreBindTenant = true
  let newUser = await createUser(user.email, req.ctx)
  newUser.data.nome = user.name
  const { picture } = user
  if (picture && !newUser.data.fotoId) {
    const tempName = `avatar/user/${uuid.v1().replace(/-/g, '')}`
    newUser.data.fotoId = await fileService.downloadFile(picture, tempName, req.ctx)
  }
  newUser = await User.save(newUser, req.ctx)
  const token = await generateToken(newUser, '1m')
  if (newUser.data.isAdmin === false) {
    await service.injectable(newUser, req.ctx)
  }
  res.cookie('krapp-jwt', token)
  res.redirect(`${process.env.ENVIRONMENT_WEB_FRONT_URL}/oauth`)
}

// para fazer injeção de dependência
const injectable = async (user) => {
}

const service = {
  login,
  injectable
}

module.exports = service
