const Origem = require('../models/origem.model')
module.exports = {
  createOrigem: async (model, descricao, url, ctx) => {
    return Origem.create({
      data: {
        origemId: model.id,
        url,
        descricao
      }
    }, ctx)
  },
  getOrigem: async (id, ctx) => {
    return Origem.findAll({ where: { data: { origemId: id } } }, ctx)
  }
}
