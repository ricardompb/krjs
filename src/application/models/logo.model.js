const Model = require('../../core/model')
const File = require('../models/file.model')

module.exports = new Model.Schema({
  name: 'application/logo',
  label: 'Logo',
  model: {
    fileId: {
      type: new Model.ForeignKey(File),
      label: 'Logo',
      required: true
    }
  }
})
