const FieldOptions = require('../../core/fieldOptions')
const Model = require('../../core/model')
const { TIPO_ENDERECO } = require('../../endereco')

module.exports = new Model.Schema({
  name: 'endereco/tipo-endereco-options',
  label: 'Tipo de Endereco',
  ...FieldOptions,
  VALUE: TIPO_ENDERECO
})
