const Model = require('../../core/model')
const User = require('../../application/models/user.model')

module.exports = new Model.Schema({
  name: 'application/transaction',
  label: 'Transação',
  model: {
    description: {
      type: Model.String,
      label: 'Descrição',
      required: true
    },
    userId: {
      type: new Model.ForeignKey(User),
      label: 'Usuário'
    }
  }
})
