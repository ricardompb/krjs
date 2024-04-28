const axios = require('axios')

const api = axios.create({ baseURL: process.env.ENVIRONMENT_EVOLUTION_BASE_URL })
api.interceptors.request.use((config) => {
  config.headers['Content-Type'] = 'application/json'
  config.headers.apikey = process.env.ENVIRONMENT_EVOLUTION_APIKEY
  return config
}, (error) => {
  return Promise.reject(error)
})

module.exports = api
