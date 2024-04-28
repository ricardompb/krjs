let vault = null

const setup = () => {
  if (!process.env.KRAPP_SECRET) return
  const options = JSON.parse(process.env.KRAPP_SECRET)
  vault = require('node-vault')(options)
}

const read = async (key) => {
  return new Promise((resolve, reject) => {
    vault.read(key)
      .then(response => {
        resolve(response.data)
      })
      .catch(e => reject(e))
  })
}

module.exports = {
  setup,
  read
}
