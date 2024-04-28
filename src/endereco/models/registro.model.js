const Model = require('../../core/model')
const Bairro = require('../models/bairro.model')
const Cidade = require('../models/cidade.model')
const Estado = require('../models/estado.model')
const Pais = require('../models/pais.model')
const { unmask } = require('../../core/utils')
const TipoEndereco = require('./tipo-endereco-options.model')

module.exports = new Model.Schema({
  name: 'endereco/registro',
  label: 'Endereço',
  multiTenant: false,
  model: {
    tipoEnderecoId: {
      type: new Model.ForeignKey(TipoEndereco),
      label: 'Tipo de Endereço'
    },
    cep: {
      type: Model.String,
      label: 'Cep',
      required: true,
      unmask
    },
    logradouro: {
      type: Model.String,
      label: 'Logradouro',
      required: true
    },
    complemento: {
      type: Model.String,
      label: 'Complemento'
    },
    bairroId: {
      type: new Model.ForeignKey(Bairro),
      label: 'Bairro',
      required: true
    },
    cidadeId: {
      type: new Model.ForeignKey(Cidade),
      label: 'Cidade',
      required: true
    },
    estadoId: {
      type: new Model.ForeignKey(Estado),
      label: 'Estado',
      required: true
    },
    paisId: {
      type: new Model.ForeignKey(Pais),
      label: 'País',
      required: true
    }
  }
})
