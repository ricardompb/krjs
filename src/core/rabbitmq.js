const client = require('amqplib')

const producer = async (id, data) => {
  const connection = await client.connect()
  const channel = await connection.createChannel()
  await channel.assertQueue(id, { durable: false })
  channel.sendToQueue(id, JSON.stringify(data))
  connection.close()
}
const consumer = async (id) => {
  const connection = await client.connect()
  const channel = await connection.createChannel()
  await channel.assertQueue(id, { durable: false })
  const res = await (new Promise((resolve) => {
    channel.consume(id, (message) => {
      resolve(message)
    })
  }))
  connection.close()
  return res
}

module.exports = { producer, consumer }
