const axios = require('axios')
const SystemError = require('../../core/SystemError')
const { createUser, generateToken } = require('./auth.service')
const User = require('../models/user.model')
const { uuid } = require('../../core/utils')
const { downloadFile } = require('./file.service')

const login = async (req, res) => {
  if (!process.env.PLUGINS_APPLICATION_SOCIAL_AUTH0_DOMAIN_ID) {
    return res.status(404).send()
  }
  const { code } = req.query
  const tokenInfo = await axios.post(`https://${process.env.PLUGINS_APPLICATION_SOCIAL_AUTH0_DOMAIN_ID}/oauth/token`, {
    grant_type: 'authorization_code',
    client_id: process.env.PLUGINS_APPLICATION_SOCIAL_AUTH0_CLIENT_ID,
    client_secret: process.env.PLUGINS_APPLICATION_SOCIAL_AUTH0_CLIENT_SECRET,
    code,
    redirect_uri: `${process.env.ENVIRONMENT_WEB_URL}${process.env.PLUGINS_APPLICATION_SOCIAL_AUTH0_REDIRECT_URI}`
  })

  const { access_token } = tokenInfo.data
  const user = await axios.get(`https://${process.env.PLUGINS_APPLICATION_SOCIAL_AUTH0_DOMAIN_ID}/userinfo`, {
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  })

  if (!user) {
    throw new SystemError('Não foi possível obter informações da conta do Google.')
  }

  if (!user.data.email) {
    throw new SystemError('Não há email configurado na conta do Google.')
  }

  req.ctx.custom = req.ctx.custom || {}
  req.ctx.custom.ignoreBindTenant = true
  let newUser = await createUser(user.data.email, req.ctx)
  newUser.data.nome = user.data.name
  const { picture } = user.data
  if (picture && !newUser.data.fotoId) {
    const tempName = `avatar/user/${uuid.v1().replace(/-/g, '')}`
    newUser.data.fotoId = await downloadFile(picture, tempName, req.ctx)
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
const injectable = async (user) => {}

const service = {
  login,
  injectable
}
module.exports = service
