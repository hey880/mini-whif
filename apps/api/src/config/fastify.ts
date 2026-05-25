import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createServer() {
  let logger;

  if (process.env.NODE_ENV === 'production') {
    // 프로덕션: stdout + 파일 동시 출력
    const logDir = path.resolve(__dirname, '../../logs');
    fs.mkdirSync(logDir, { recursive: true });

    const streams = [
      { stream: process.stdout },
      { stream: pino.destination(path.join(logDir, 'api.log')) }
    ];

    logger = {
      level: process.env.LOG_LEVEL || 'info',
      timestamp: () => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const offset = -now.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const abs = Math.abs(offset);
        const tz = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
        return `,"time":"${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${tz}"`;
      },
      stream: pino.multistream(streams)
    };
  } else {
    // 개발: stdout only (pretty-print)
    logger = {
      level: process.env.LOG_LEVEL || 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss o',
          ignore: 'pid,hostname',
        },
      },
    };
  }

  const server = Fastify({
    logger,
    // OPTIMIZATION: timeout settings for stability
    connectionTimeout: 60000,      // 60s - max time for connection to remain open
    keepAliveTimeout: 65000,       // 65s - must be > connectionTimeout
    requestTimeout: 30000,         // 30s - max time for request processing (SSE routes override this)
  });

  // CORS configuration
  server.register(cors, {
    origin: (origin, cb) => {
      const allowedOrigins: string[] = [
        process.env.NEXT_PUBLIC_APP_URL,
        'http://localhost:3001',
        'http://13.236.207.105:3001',
      ].filter((x): x is string => typeof x === 'string');

      // Allow requests with no origin (e.g., mobile apps, Postman)
      if (!origin) {
        cb(null, true);
        return;
      }

      if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    // ConnectRPC specific headers
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Connect-Protocol-Version',
      'Connect-Timeout-Ms',
      'X-User-Agent',
      'X-Grpc-Web',
    ],
    exposedHeaders: [
      'Connect-Protocol-Version',
      'Connect-Timeout-Ms',
      'Trailer',
      'Grpc-Status',
      'Grpc-Message',
    ],
  });

  // Swagger documentation
  server.register(swagger, {
    openapi: {
      info: {
        title: 'Persona Chat API',
        description: 'AI Character Chatbot API with ConnectRPC',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Global error handler
  server.setErrorHandler((error, _request, reply) => {
    server.log.error(error);

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    reply.status(statusCode).send({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });
  });

  return server;
}
