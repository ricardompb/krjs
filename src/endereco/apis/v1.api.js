const Api = require('../../core/api')
const { consultaCep } = require('../services/endereco.service')

module.exports = new Api.Rest({
  name: 'endereco/v1',
  label: 'Api de endereço',
  POST: {
    'consulta-cep': {
      anonymous: true,
      transaction: 'Consulta Cep',
      async handler (req, res) {
        return consultaCep(req.body, req.ctx)
      }
    }
  }
})
