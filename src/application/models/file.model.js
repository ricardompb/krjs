const Model = require('../../core/model')

module.exports = new Model.Schema({
  name: 'application/file',
  label: 'Arquivo',
  model: {
    filename: {
      type: Model.String,
      label: 'Nome do Arquivo',
      required: true
    },
    originalname: {
      type: Model.String,
      label: 'Nome Original do Arquivo',
      required: true
    },
    encoding: {
      type: Model.String,
      label: 'Encoding'
    },
    mimetype: {
      type: Model.String,
      label: 'Tipo do arquivo',
      required: true
    },
    destination: {
      type: Model.String,
      label: 'Destino',
      required: true
    },
    size: {
      type: Model.Number,
      label: 'Tamanho',
      required: true
    }
  }
})
