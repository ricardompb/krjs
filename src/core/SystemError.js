module.exports = class SystemError extends Error {
  constructor (message) {
    super(message)
    this.name = 'SystemError'
  }
}
