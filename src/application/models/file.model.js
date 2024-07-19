const Model = require('../../core/model')

module.exports = new Model.Schema({
  name: 'application/file',
  label: 'Arquivo',
  model: {
    filename: {
      type: Model.String,
      label: 'Nome do Arquivo',
      required: true,
      search: true
    },
    originalname: {
      type: Model.String,
      label: 'Nome Original do Arquivo',
      required: true,
      search: true
    },
    encoding: {
      type: Model.String,
      label: 'Encoding',
      search: true
    },
    mimetype: {
      type: Model.String,
      label: 'Tipo do arquivo',
      required: true,
      search: true
    },
    destination: {
      type: Model.String,
      label: 'Destino',
      required: true,
      search: true
    },
    size: {
      type: Model.Number,
      label: 'Tamanho',
      required: true,
      search: true
    }
  }
})
