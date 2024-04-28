const swaggerUi = require('swagger-ui-express')

const document = {
  openapi: '3.1.0',
  info: {
    description: process.env.ENVIRONMENT_DESCRIPTION,
    version: '1.0.1',
    title: process.env.ENVIRONMENT_APP,
    contact: {
      name: 'Ricardo Silva Pereira',
      url: 'https://krinfo.com.br/#contato',
      email: 'ricardo@krinfo.com.br'
    }
  },
  servers: [
    {
      url: `http://localhost:${process.env.ENVIRONMENT_API_PORT}/api`,
      description: 'Ambiente de Desenvolvimento'
    },
    {
      url: `https:/${process.env.ENVIRONMENT_API_SERVER}/api`,
      description: 'Ambiente de Produção'
    }
  ],
  components: {
    securitySchemes: {
      Bearer: {
        description: `<strong>Descrição:</strong> Autenticação do ${process.env.ENVIRONMENT_APP}`,
        type: 'apiKey',
        name: 'Authorization',
        in: 'header'
      }
    },
    schemas: {
      error: {
        type: 'object',
        properties: {
          error: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Erro ao tentar obter dados no servidor de aplicação'
          }
        }
      }
    }
  },
  security: [{
    Bearer: []
  }],
  paths: {}
}

const addSchema = schema => {
  document.components.schemas = Object.assign(schema, document.components.schemas)
}
const addPath = path => {
  document.paths = Object.assign(path, document.paths)
}

module.exports = {
  addSchema,
  addPath,
  setup (config, app) {
    app.use('/swagger', swaggerUi.serve, swaggerUi.setup(document))
  }
}
