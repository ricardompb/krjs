const bcrypt = require('bcryptjs')
const crypto = require('node:crypto')
const hash = async (val) => {
  return bcrypt.hash(val, parseInt(process.env.ENVIRONMENT_AUTH_SALT))
}
const compare = async (val, valHash) => {
  return bcrypt.compare(val, valHash)
}
const scryptSync = () => {
  const key = crypto.scryptSync(process.env.ENVIRONMENT_SECURITY_PASSWORD, 'salt', 24)
  const iv = Buffer.alloc(16, 0)
  return { key, iv }
}
const encrypt = val => {
  const { key, iv } = scryptSync()
  const cipher = crypto.createCipheriv(process.env.ENVIRONMENT_SECURITY_ALGORITHM, key, iv)
  let encrypted = cipher.update(val, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}
const decrypt = val => {
  const { key, iv } = scryptSync()
  const decipher = crypto.createDecipheriv(process.env.ENVIRONMENT_SECURITY_ALGORITHM, key, iv)
  let decrypted = decipher.update(val, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
module.exports = {
  hash,
  compare,
  encrypt,
  decrypt
}
