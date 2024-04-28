const FieldOptions = require('../../core/fieldOptions')
const Model = require('../../core/model')
const { YES_NO } = require('../../application')

module.exports = new Model.Schema({
  name: 'application/yes-no-options',
  label: 'Sim/Não Options',
  ...FieldOptions,
  VALUE: YES_NO
})
