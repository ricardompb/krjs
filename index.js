const Db = require('./src/core/db')
const Api = require('./src/core/api')
const Model = require('./src/core/model')
const Logger = require('./src/core/logger')
const Scheduler = require('./src/core/scheduler')
const SystemError = require('./src/core/SystemError')
const Pdf = require('./src/core/pdf')
const Secret = require('./src/core/secret')
const Utils = require('./src/core/utils')
const Wa = require('./src/core/wa')
const FieldOptions = require('./src/core/fieldOptions')
const EnderecoService = require('./src/endereco/services/endereco.service')
const { consultaCep } = EnderecoService

module.exports = {
  Db,
  Api,
  Model,
  Logger,
  Scheduler,
  SystemError,
  Pdf,
  Secret,
  Utils,
  Wa,
  FieldOptions,
  Endereco: {
    consultaCep
  }
}