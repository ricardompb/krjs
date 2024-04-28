const axios = require('axios')
const { createUser, generateToken } = require('./auth.service')
const { uuid } = require('../../core/utils')
const fileService = require('./file.service')
const User = require('../models/user.model')

const login = async (req, res) => {
  if (!process.env.PLUGINS_APPLICATION_SOCIAL_AZURE_CLIENT_ID) {
    return res.status(404).send()
  }

  const { code } = req.query
  const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', new URLSearchParams({
    client_id: process.env.PLUGINS_APPLICATION_SOCIAL_AZURE_CLIENT_ID,
    client_secret: process.env.PLUGINS_APPLICATION_SOCIAL_AZURE_CLIENT_SECRET,
    code,
    redirect_uri: `${process.env.ENVIRONMENT_WEB_URL}${process.env.PLUGINS_APPLICATION_SOCIAL_AZURE_REDIRECT_URI}`,
    grant_type: 'authorization_code',
    scope: 'https://graph.microsoft.com/User.Read'
  }))
  const { access_token } = response.data

  const headers = {
    Authorization: `Bearer ${access_token}`
  }

  const user = await axios.get('https://graph.microsoft.com/v1.0/me', { headers })
  const { displayName, userPrincipalName } = user.data

  req.ctx.custom = req.ctx.custom || {}
  req.ctx.custom.ignoreBindTenant = true
  let newUser = await createUser(userPrincipalName, req.ctx)
  newUser.data.nome = displayName

  if (!newUser.data.fotoId) {
    const photo = await axios.get('https://graph.microsoft.com/v1.0/me/photo/$value', {
      headers,
      responseType: 'arraybuffer'
    })
    const tempName = `avatar/user/${uuid.v1().replace(/-/g, '')}`
    const contentType = photo.headers['content-type']
    const [, ext] = contentType.split('/')
    const fileContent = {
      data: Buffer.from(photo.data),
      fileName: `${tempName}.${ext}`,
      contentType,
      contentLength: photo.data.length
    }
    newUser.data.fotoId = await fileService.downloadFile(fileContent, fileContent.fileName, req.ctx)
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
