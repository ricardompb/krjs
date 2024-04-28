const axios = require('axios')
const User = require('../models/user.model')
const { generateToken, createUser } = require('./auth.service')
const { uuid } = require('../../core/utils')
const fileService = require('./file.service')

const login = async (req, res) => {
  if (!process.env.PLUGINS_APPLICATION_SOCIAL_GITHUB_CLIENT_ID) {
    return res.status(404).send()
  }

  const { code } = req.query
  const response = await axios.post('https://github.com/login/oauth/access_token', {
    client_id: process.env.PLUGINS_APPLICATION_SOCIAL_GITHUB_CLIENT_ID,
    client_secret: process.env.PLUGINS_APPLICATION_SOCIAL_GITHUB_CLIENT_SECRET,
    code
  })

  const [, parts] = response.data.split('=')
  const [githubToken] = parts.split('&')
  const user = await axios.get('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${githubToken}`
    }
  })

  req.ctx.custom = req.ctx.custom || {}
  req.ctx.custom.ignoreBindTenant = true
  const email = user.data.email || `${user.data.login}@github.com`
  let newUser = await createUser(email, req.ctx)
  newUser.data.nome = user.data.name
  const { avatar_url } = user.data
  if (avatar_url && !newUser.data.fotoId) {
    const tempName = `avatar/user/${uuid.v1().replace(/-/g, '')}`
    newUser.data.fotoId = await fileService.downloadFile(avatar_url, tempName, req.ctx)
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
