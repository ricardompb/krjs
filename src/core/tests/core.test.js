const Model = require('../model')
const { expect } = require('@jest/globals')
test('model', async () => {
  const User = new Model.Schema({})
  const user = await User.get('151cb3e0-e387-45ed-9646-fe9b0562f95a', {})
  expect(user.id).toBe('151cb3e0-e387-45ed-9646-fe9b0562f95a')
})
