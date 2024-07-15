const express = require('express')
const { createLogger, format, transports } = require('winston')
const { combine, timestamp, printf } = format
const { sendMail } = require('../application/services/mail.service')

let wId

const formatter = printf((info) => {
  const {
    level,
    stack,
    message,
    durationMs,
    timestamp,
    timeout,
    timeoutError,
    enabled,
    sql,
    req,
    body
  } = info

  if (enabled === false) {
    info.ignore = true
    return
  }

  const text = [message]

  if (durationMs) text.push(`duration=${durationMs}ms`)
  if (sql) text.push(`\n${sql.trim()}`)
  if (body) text.push(`\n${JSON.stringify(body)}`)
  if (stack) text.push(`\n${stack}`)
  if (req) {
    const val = ['']
    val.push(`${req.method}=${req.originalUrl}`)
    if (req.query) val.push(`query=${JSON.stringify(req.query)}`)
    if (req.body) val.push(`body=${JSON.stringify(req.body)}`)
    if (req.ctx && req.ctx.user) val.push(`user=${req.ctx.user.data.email}`)
    text.push(val.join('\n'))
  }

  if (timeoutError === true) {
    if (timeout && (durationMs || 0) > timeout) {
      logger.warn(`[TIMEOUT] ${text.join(' ')}`)
      info.ignore = true
      return
    }

    if (timeout) {
      info.ignore = true
      return
    }
  }

  const res = `${timestamp} ${wId} [${level}] ${text.join(' ')}`
  if (level === 'error' && process.env.ENVIRONMENT_PRODUCTION === 'true') {
    const developers = process.env.ENVIRONMENT_DEVELOPERS
      ? JSON.parse(process.env.ENVIRONMENT_DEVELOPERS)
      : []
    developers.forEach(developer => {
      sendMail({
        to: developer.to,
        subject: 'Erro',
        text: stack || message
      }, {}).catch()
    })
  }

  return res
})

const ignore = format((info, opts) => {
  return info.ignore === true ? false : info
})

const logger = createLogger({
  level: process.env.ENVIRONMENT_PRODUCTION === 'true' ? 'info' : 'debug',
  format: combine(
    format.colorize(),
    timestamp(),
    formatter,
    ignore()
  ),
  transports: [new transports.Console()]
})

logger.addCluster = (cluster) => {
  if (cluster.isMaster) {
    wId = `${cluster.workerId}.${process.pid}`
  } else {
    wId = `${cluster.workerId}.${cluster.worker.process.pid}`
  }
}

module.exports = logger
