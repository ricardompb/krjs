const Api = require('../core/api')

const UF = {
  AC: 'acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
  DF: 'Distrito Federal'
}

const TIPO_ENDERECO = {
  ENTREGA: 10,
  COBRANCA: 20,
  OUTROS: 30
}
TIPO_ENDERECO.OPTIONS = [
  { label: 'ENTREGA', value: TIPO_ENDERECO.ENTREGA, order: 1 },
  { label: 'COBRANÇA', value: TIPO_ENDERECO.COBRANCA, order: 2 },
  { label: 'OUTROS', value: TIPO_ENDERECO.OUTROS, order: 3 }
]

module.exports = {
  name: 'endereco',
  label: 'Endereço',
  UF,
  TIPO_ENDERECO,
  async setup () {
    Api.Register('/endereco/models/tipo-endereco-options.model')
    Api.Register('/endereco/models/registro.model')
    Api.Register('/endereco/models/bairro.model')
    Api.Register('/endereco/models/cidade.model')
    Api.Register('/endereco/models/estado.model')
    Api.Register('/endereco/models/pais.model')
    Api.Register('/endereco/apis/v1.api')
  }
}
