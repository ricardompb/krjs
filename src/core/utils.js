const uuid = require('uuid')
const emailValidator = require('email-validator')
const moment = require('moment')
const momentTimeZone = require('moment-timezone')
const extenso = require('extenso')
const { cnpj: isValidCnpj, cpf: isValidCpf } = require('cpf-cnpj-validator')

momentTimeZone.tz.setDefault('America/Sao_Paulo')
const { NodeVM } = require('vm2')

Array.prototype.groupToObject = function (keyFn) { // nosonar
  return this.reduce((acc, val) => {
    const key = keyFn(val)
    acc[key] = acc[key] || []
    acc[key] = acc[key].concat(val)
    return acc
  }, {})
}

Array.prototype.remove = function (fn, condition) {
  const index = this.findIndex(fn)
  if (index > -1) {
    const result = condition
      ? condition(this[index])
      : true
    this.splice(index, 1)
    return result
  }
  return false
}

Array.prototype.forEachAsync = async function (fn) { // nosonar
  let index = 0
  for (const item of this) {
    await fn(item, index++)
  }
}
Array.prototype.forEachAsyncParallel = async function (fn) { // nosonar
  await Promise.all(this.map(fn))
}
Array.prototype.mapAsync = async function (fn) { // nosonar
  const res = []
  let index = 0
  for (const item of this) {
    res.push(await fn(item, index++))
  }
  return res
}
Array.prototype.filterAsync = async function (fn) { // nosonar
  const res = []
  let index = 0
  for (const item of this) {
    if (await fn(item, index++)) {
      res.push(item)
    }
  }
  return res
}
Array.prototype.reduceToObject = function (keyFn, valFn) { // nosonar
  return this.reduce((acc, cur) => {
    const key = keyFn(cur)
    acc[key] = (valFn) ? valFn(acc[key]) : cur
    return acc
  }, {})
}
Array.prototype.groupBy = function (keyFn) { // nosonar
  return this.reduce((acc, val) => {
    const key = keyFn(val)
    acc[key] = acc[key] || []
    acc[key] = acc[key].concat(val)
    return acc
  }, {})
}
Number.prototype.convert = val => { // nosonar
  if (!val) return 0
  return parseFloat(val)
}
Number.prototype.round = function (places) {
  return +(Math.round(this + 'e+' + places) + 'e-' + places) // nosonar
}
String.prototype.convert = val => { // nosonar
  if (!val?.trim) return ''
  return val.trim()
}
Boolean.prototype.convert = val => { // nosonar
  if (val === true) return true
  if (val === 1) return true
  if (/t/i.test(val)) return true
  if (/f/i.test(val)) return false
  return /true/i.test(val)
}
const getFormatDateTime = (val) => {
  let [date, time] = val.split(' ')
  date = date.split('/').reverse().join('-')
  date = moment.tz(`${date} ${time || '00:00:00'}`, 'America/Sao_Paulo')
  date = date.format()
  return date
}

Date.prototype.convert = val => { // nosonar
  if (!val) return
  if (/T/i.test(val)) return val
  return getFormatDateTime(val)
}
const formatMoney = (val, locales = 'pt-BR', currency = 'BRL') => {
  return new Intl.NumberFormat(locales, {
    style: 'currency',
    currency
  }).format(val)
}
const unmask = (val) => {
  return (val || '').replace(/\D/g, '')
}
const currentDateTime = () => {
  const now = new Date()
  if (process.env.ENVIRONMENT_DATETIME_DST) {
    if (process.env.ENVIRONMENT_DATETIME_DST) {
      now.setHours(now.getHours() + 1)
    }
    if (process.env.ENVIRONMENT_DATETIME_HOUR !== undefined) {
      now.setHours(now.getHours() + process.env.ENVIRONMENT_DATETIME_HOUR)
    }
  }
  return moment(now)
}
const sleep = async (delay) => {
  return new Promise(resolve => {
    setTimeout(resolve, delay)
  })
}
function round (val, precision) {
  if (typeof val === 'number') {
    return val.round(precision)
  }
  return val
}
const cpfIsValid = val => {
  const cpf = unmask(val)
  return isValidCpf.isValid(cpf)
}
const cnpjIsValid = val => {
  const cnpj = unmask(val)
  return isValidCnpj.isValid(cnpj)
}
const toExtenso = (val, precision = 2) => {
  val = val || 0
  return extenso(`${(val).toFixed(precision)}`.replace(/[.]/g, ','), { mode: 'currency' })
}
const dateTimePattern = /(^\d{2}[./-]\d{2}[./-]\d{4}$)|(^\d{2}[./-]\d{2}[./-]\d{4}[' ]\d{2}:\d{2}:\d{2}$)/ // nosonar
const searchText = val => {
  if (!val) return
  return val.match(dateTimePattern)
    ? getFormatDateTime(val)
    : val
}
const convertToBase64 = val => Buffer.from(val).toString('base64')
const formatCep = val => {
  if (!val) return
  return val.replace(/^(\d{5})(\d{3})/, '$1-$2')
}
const uuidValidate = val => {
  if (!val) return
  return uuid.validate(val)
}

String.prototype.isBefore = function (data) { // nosonar
  const internalData1 = (() => {
    const result = /T/.test(this)
      ? this.toString()
      : searchText(this)
    return result.toString()
  })()
  const internalData2 = (() => {
    const result = /T/.test(data)
      ? data.toString()
      : searchText(data)
    return result.toString()
  })()
  const data1 = moment(internalData1)
  const data2 = moment(internalData2)
  return data1.isBefore(data2)
}

const convertToCode = val => {
  const vm = new NodeVM({ console: 'inherit' })
  return vm.run(`module.exports = ${val}`)
}

const formatCpfCnpj = val => {
  if (!val) return
  return val.length === 11
    ? val.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : val.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

const unaccent = val => val?.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

module.exports = {
  uuid,
  emailValidator,
  dateTimePattern,
  uuidValidate,
  unmask,
  currentDateTime,
  sleep,
  round,
  cpfIsValid,
  cnpjIsValid,
  formatMoney,
  toExtenso,
  searchText,
  getFormatDateTime,
  convertToBase64,
  formatCep,
  convertToCode,
  formatCpfCnpj,
  unaccent
}
