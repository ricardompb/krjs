const Api = require('../../core/api')
const { updateParameters, getAllParameters } = require('../services/parameter.service')

module.exports = new Api.Rest({
  name: 'application/parameter',
  label: 'Parâmetros',
  GET: {
    model: {
      anonymous: true,
      label: 'Parâmetro - Consulta',
      async handler (req) {
        return getAllParameters(req.ctx)
      }
    }
  },
  PUT: {
    model: {
      label: 'Parâmetro - Alteração',
      transaction: 'Update params',
      async handler (req) {
        return updateParameters(req.body, req.ctx)
      }
    }
  }
})
