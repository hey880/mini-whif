import { FastifySwaggerUiOptions } from '@fastify/swagger-ui'

const swaggerConfig = {
  swagger: {
    info: {
      title: 'Mini-Whif API',
      description: 'Mini Whif에서 사용되는 REST API 명세서 입니다.',
      version: '1.0.0',
    },
    host: 'localhost:8083',
    basePath: '/', // swagger에서 request 전송 시 사용하는 기본 endpoint
  },
}

const swaggerUiConfig: FastifySwaggerUiOptions = {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'full',
  },
}

export { swaggerConfig, swaggerUiConfig }
