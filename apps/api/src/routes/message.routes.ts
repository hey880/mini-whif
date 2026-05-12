import type { FastifyInstance } from 'fastify';
import { authenticateUser } from '../plugins/auth.js';
import { prisma } from '../config/prisma.js';

export async function messageRoutes(server: FastifyInstance) {
  // Update message content
  server.put('/messages/:id', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['Messages'],
      description: 'Update a message content',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { content } = request.body as { content: string };

    // Get message and verify ownership
    const message = await prisma.message.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!message) {
      return reply.status(404).send({ error: 'Message not found' });
    }

    if (message.room.userId !== request.user!.id) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    // Update message
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { content },
    });

    return { success: true, message: updatedMessage };
  });

  // Delete message
  server.delete('/messages/:id', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['Messages'],
      description: 'Delete a message and its AI response',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Get message and verify ownership
    const message = await prisma.message.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!message) {
      return reply.status(404).send({ error: 'Message not found' });
    }

    if (message.room.userId !== request.user!.id) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    // If this is a user message, find and delete the next AI response
    if (message.role === 'user') {
      const aiResponse = await prisma.message.findFirst({
        where: {
          roomId: message.roomId,
          role: 'assistant',
          createdAt: { gt: message.createdAt },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (aiResponse) {
        await prisma.message.delete({ where: { id: aiResponse.id } });
      }
    }

    // Delete the message
    await prisma.message.delete({ where: { id } });

    return { success: true };
  });

  // Toggle bookmark
  server.post('/messages/:id/bookmark', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['Messages'],
      description: 'Toggle message bookmark',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Get message and verify ownership
    const message = await prisma.message.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!message) {
      return reply.status(404).send({ error: 'Message not found' });
    }

    if (message.room.userId !== request.user!.id) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    // Toggle bookmark in metadata
    const metadata = (message.metadata as any) || {};
    const isBookmarked = metadata.isBookmarked || false;

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        metadata: {
          ...metadata,
          isBookmarked: !isBookmarked,
        },
      },
    });

    return {
      success: true,
      isBookmarked: !isBookmarked,
      message: updatedMessage,
    };
  });

  // Upsert feedback
  server.post('/messages/:id/feedback', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['Messages'],
      description: 'Upsert message feedback (like/dislike)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['isPositive'],
        properties: {
          isPositive: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { isPositive } = request.body as { isPositive: boolean };

    // Convert boolean to reactionType string
    const reactionType = isPositive ? 'positive' : 'negative';

    // Get message and verify ownership
    const message = await prisma.message.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!message) {
      return reply.status(404).send({ error: 'Message not found' });
    }

    if (message.room.userId !== request.user!.id) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    // Upsert reaction
    const existingReaction = await prisma.userReaction.findUnique({
      where: {
        userId_messageId: {
          userId: request.user!.id,
          messageId: id,
        },
      },
    });

    if (existingReaction) {
      // If same reaction, delete it (toggle off)
      if (existingReaction.reactionType === reactionType) {
        await prisma.userReaction.delete({
          where: { id: existingReaction.id },
        });

        // Update counts
        if (isPositive) {
          await prisma.message.update({
            where: { id },
            data: { positiveReactionCount: { decrement: 1 } },
          });
        } else {
          await prisma.message.update({
            where: { id },
            data: { negativeReactionCount: { decrement: 1 } },
          });
        }

        return { success: true, removed: true };
      } else {
        // Change reaction
        await prisma.userReaction.update({
          where: { id: existingReaction.id },
          data: { reactionType },
        });

        // Update counts
        await prisma.message.update({
          where: { id },
          data: {
            positiveReactionCount: isPositive ? { increment: 1 } : { decrement: 1 },
            negativeReactionCount: isPositive ? { decrement: 1 } : { increment: 1 },
          },
        });

        return { success: true, changed: true, isPositive };
      }
    } else {
      // Create new reaction
      await prisma.userReaction.create({
        data: {
          userId: request.user!.id,
          messageId: id,
          reactionType,
        },
      });

      // Update counts
      if (isPositive) {
        await prisma.message.update({
          where: { id },
          data: { positiveReactionCount: { increment: 1 } },
        });
      } else {
        await prisma.message.update({
          where: { id },
          data: { negativeReactionCount: { increment: 1 } },
        });
      }

      return { success: true, created: true, isPositive };
    }
  });
}
