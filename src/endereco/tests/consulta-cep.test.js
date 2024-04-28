const { consultaCep } = require('../services/endereco.service')
const { test, expect } = require('@jest/globals')

test('Consulta Cep', async () => {
  const mock = await consultaCep({ cep: '01001-000' })
  const res = mock()
  expect(res).toStrictEqual({
    cep: '01001-000',
    logradouro: 'Praça da Sé',
    complemento: 'lado ímpar',
    bairro: 'Sé',
    localidade: 'São Paulo',
    uf: 'SP',
    ibge: '3550308',
    gia: '1004',
    ddd: '11',
    siafi: '7107'
  })
})
