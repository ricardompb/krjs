const Api = require('../../core/api')
const { register, login, reset, sendEnvite, setUsetAdmin, forgot, loginByToken, gerarTokenAcesso } = require('../services/auth.service')
const GoogleService = require('../services/google.service')
const GithubService = require('../services/github.service')
const AzureService = require('../services/azure.service')
const Auth0Service = require('../services/auth0.service')

module.exports = new Api.Rest({
  name: 'application/auth',
  label: 'Autenticação/Autorização',
  GET: {
    google: {
      anonymous: true,
      transaction: 'Login social: Google',
      handler: GoogleService.login
    },
    github: {
      anonymous: true,
      transaction: 'Login social: Github',
      handler: GithubService.login
    },
    azure: {
      anonymous: true,
      transaction: 'Login social: Azure',
      handler: AzureService.login
    },
    auth0: {
      anonymous: true,
      transaction: 'Login social: Auth0',
      handler: Auth0Service.login
    }
  },
  POST: {
    login: {
      schema: {
        name: 'application/authentication',
        model: {
          email: { type: String },
          password: { type: String }
        }
      },
      multiTenant: false,
      anonymous: true,
      async handler (req) {
        return login(req.body, req.ctx)
      }
    },
    reset: {
      anonymous: true,
      label: 'Reseta senha do Usuário',
      transaction: 'Reseta senha do Usuário',
      async handler (req) {
        return reset(req.body, req.ctx)
      }
    },
    register: {
      anonymous: true,
      authenticate: false,
      label: 'Registra um novo usuário',
      transaction: 'Registra um novo usuário',
      async handler (req) {
        return register(req.body, req.ctx)
      }
    },
    'send-envite': {
      label: 'Enviar Convite',
      transaction: 'Enviar Convite',
      async handler (req) {
        return sendEnvite(req.body, req.ctx)
      }
    },
    'set-admin': {
      label: 'Tornar Usuário Administrador',
      transaction: 'Tornar Usuário Administrador',
      async handler (req) {
        return setUsetAdmin(req.body, req.ctx)
      }
    },
    forgot: {
      anonymous: true,
      label: 'Esquecer senha do suário',
      transaction: 'Esquecer senha do suário',
      async handler (req) {
        return forgot(req.body, req.ctx)
      }
    },
    'login-by-token': {
      anonymous: true,
      label: 'Login Social',
      transaction: 'Login Social',
      async handler (req) {
        return loginByToken(req.body, req.ctx)
      }
    },
    'gerar-token': {
      label: 'Gerar Token',
      transaction: 'Gerar Token',
      handler: async (req, res) => {
        return gerarTokenAcesso(req.body, req.ctx)
      }
    }
  }
})
