const { createClient } = require('redis')
const logger = require('./logger')
const client = createClient()
client.on('error', err => logger.error(err.message))
const connect = async () => {
  // await client.connect()
}
const set = async (key, value) => {
  await client.set(key, value)
}

module.exports = {
  connect,
  set
}
