const fs = require('node:fs/promises')
const path = require('node:path')
const axios = require('axios')

const filesDir = process.env.ENVIRONMENT_FILES

const mkdir = async (destination, recursive = true) => {
  const dir = path.join(filesDir, destination)
  await fs.mkdir(dir, { recursive })
  return dir
}
const writeFile = async (destination, data) => {
  const dataFormatted = (() => {
    try {
      return JSON.stringify(JSON.parse(data), null, 2)
    } catch {
      return data
    }
  })()
  const dir = destination.split('/')
  dir.pop()
  await mkdir(dir.join('/'), true)
  return fs.writeFile(path.join(filesDir, destination), dataFormatted)
}
const readFiles = async (destination, withFileTypes = true) => {
  const files = await fs.readdir(path.join(filesDir, destination), { withFileTypes })
  return withFileTypes ? (files.filter(f => f.isFile()) || []).map(f => f.name) : files
}
const moveFile = async (filename, source, target) => {
  const origin = path.join(filesDir, source, filename)
  const destination = path.join(filesDir, source, target, filename)
  return fs.rename(origin, destination)
}
const readFile = async (filename, encoding = null) => {
  return fs.readFile(path.join(filesDir, filename), { encoding })
}
const reqToFile = async (req) => {
  if (!req.file) return
  let [destination, multiTenant] = req.headers.destination.split('?')
  const [, isMultiTenant] = multiTenant.split('=')
  if (`${isMultiTenant}` === 'true') {
    destination = path.join('tenant', req.headers.tenant, destination)
  }
  delete req.file.destination
  const File = require('../models/file.model')
  return File.createOrUpdate({ data: { ...req.file, destination } }, req.ctx)
}
const downloadFile = async (url, output, ctx) => {
  const { data, fileName, contentType, contentLength } = await (async () => {
    if (typeof url === 'string') {
      const response = await axios.get(url, { responseType: 'stream' })
      const contentType = response.headers['content-type']
      const [, ext] = contentType.split('/')
      const fileName = `${output}.${ext}`
      return {
        data: response.data,
        fileName,
        contentType,
        contentLength: response.headers['content-length']
      }
    }
    return url
  })()

  await writeFile(fileName, data)
  const parts = fileName.split('/')
  const filename = parts.pop()
  const destination = parts.join('/')
  const File = require('../models/file.model')
  return File.createOrUpdate({
    data: {
      filename,
      originalname: filename,
      mimetype: contentType,
      destination,
      size: parseFloat(contentLength)
    }
  }, ctx)
}

module.exports = {
  mkdir,
  writeFile,
  readFiles,
  moveFile,
  readFile,
  reqToFile,
  downloadFile
}
