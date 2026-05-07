import type { FastifyInstance } from 'fastify';
import { prisma } from '../config/prisma.js';

export async function keywordsRoutes(server: FastifyInstance) {
  server.get('/keywords', {
    schema: {
      tags: ['Keywords'],
      description: 'Get popular search keywords',
      querystring: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            default: 50,
            description: 'Number of keywords to return',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  keyword: { type: 'string' },
                  category: { type: 'string' },
                  usageCount: { type: 'number' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { limit = 50 } = request.query as { limit?: number };

    const keywords = await prisma.keyword.findMany({
      orderBy: { usageCount: 'desc' },
      take: limit,
    });

    return reply.send({
      data: keywords,
    });
  });
}
