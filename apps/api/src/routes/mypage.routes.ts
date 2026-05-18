import type { FastifyInstance } from 'fastify';
import { authenticateUser } from '../plugins/auth.js';
import { prisma } from '../config/prisma.js';
import { GemService } from '../services/gem.service.js';

export async function mypageRoutes(server: FastifyInstance) {
  // Get user profile
  server.get('/mypage/profile', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['MyPage'],
      description: 'Get user profile including chosen LLM model',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                displayName: { type: 'string' },
                avatarUrl: { type: 'string' },
                bio: { type: 'string' },
                chosenLlmModel: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    provider: { type: 'string' },
                    slug: { type: 'string' },
                    gemCostPerMessage: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const profile = await prisma.profile.findUnique({
      where: { id: request.user!.id },
      include: {
        chosenLlmModel: true,
      },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    return reply.send({
      data: {
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        chosenLlmModel: profile.chosenLlmModel ? {
          id: profile.chosenLlmModel.id,
          name: profile.chosenLlmModel.name,
          provider: profile.chosenLlmModel.provider,
          slug: profile.chosenLlmModel.slug,
          gemCostPerMessage: profile.chosenLlmModel.gemCostPerMessage,
        } : null,
      },
    });
  });

  // Get gem wallet balance
  server.get('/mypage/wallet', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['MyPage'],
      description: 'Get user gem wallet balance',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                totalGems: { type: 'number' },
                paidGemAmount: { type: 'number' },
                freeDailyGemAmount: { type: 'number' },
                freePromoGemAmount: { type: 'number' },
                freeDailyGemLastRefillDate: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const gemService = new GemService();
    const balance = await gemService.getBalance(request.user!.id);

    return reply.send({ data: balance });
  });

  // Get gem transaction logs
  server.get('/mypage/gem-logs', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['MyPage'],
      description: 'Get user gem transaction history',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            default: 20,
            description: 'Number of logs per page',
          },
          offset: {
            type: 'number',
            default: 0,
            description: 'Number of logs to skip',
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
                  userId: { type: 'string' },
                  amount: { type: 'number' },
                  gemType: { type: 'string' },
                  logType: { type: 'string' },
                  relatedOrderId: { type: 'string' },
                  relatedMessageId: { type: 'string' },
                  memo: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                limit: { type: 'number' },
                offset: { type: 'number' },
                hasMore: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { limit = 20, offset = 0 } = request.query as {
      limit?: number;
      offset?: number;
    };

    const [logs, total] = await Promise.all([
      prisma.gemLog.findMany({
        where: { userId: request.user!.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.gemLog.count({ where: { userId: request.user!.id } }),
    ]);

    return reply.send({
      data: logs,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    });
  });
}
