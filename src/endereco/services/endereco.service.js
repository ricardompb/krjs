const Endereco = require('../models/registro.model')
const Bairro = require('../models/bairro.model')
const Cidade = require('../models/cidade.model')
const Estado = require('../models/estado.model')
const Pais = require('../models/pais.model')
const { unmask } = require('../../core/utils')
const { UF } = require('../../endereco')
const axios = require('axios')

const consultaCep = async (params, ctx) => {
  const { cep } = params

  const res = await axios.get(`https://viacep.com.br/ws/${unmask(cep)}/json`)

  const endereco = await Endereco.findOne({ where: { data: { cep: unmask(cep) } } }, ctx)
  if (endereco) {
    return endereco
  }

  const { logradouro, complemento, bairro, localidade, uf, ibge, gia, ddd, siafi } = res.data
  const cidade = (() => {
    if (gia) {
      return { nome: localidade, ibge, gia, ddd, siafi }
    }
    return { nome: localidade, ibge, ddd, siafi }
  })()

  return Endereco.create({
    data: {
      cep: unmask(cep),
      logradouro: logradouro || 'Não Definido',
      complemento,
      bairroId: await Bairro.findOrCreate({ data: { nome: bairro || 'Não Definido' } }, ctx),
      cidadeId: await Cidade.findOrCreate({ data: { ...cidade } }, ctx),
      estadoId: await Estado.findOrCreate({ data: { nome: UF[uf], sigla: uf } }, ctx),
      paisId: await Pais.findOrCreate({ data: { nome: 'Brasil' } }, ctx)
    }
  }, ctx)
}

module.exports = {
  consultaCep
}
