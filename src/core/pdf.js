const pdfMake = require('pdfmake')

const defaultFonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
}

const printReport = async (doc) => {
  return new Promise((resolve) => {
    const chunks = []
    doc.on('data', chunk => {
      chunks.push(chunk)
    })

    doc.end()
    doc.on('end', () => {
      const result = Buffer.concat(chunks)
      resolve(result)
    })
  })
}

const create = (definitions) => {
  let { fonts } = definitions
  delete definitions.fonts
  fonts = fonts || defaultFonts
  const printer = new pdfMake(fonts)
  const doc = printer.createPdfKitDocument(definitions)
  return printReport(doc)
}

module.exports = {
  create
}
