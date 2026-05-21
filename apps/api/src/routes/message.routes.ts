import type { FastifyInstance } from 'fastify';
import { authenticateUser } from '../plugins/auth.js';
import { prisma } from '../config/prisma.js';
import { AIStreamingService } from '../services/ai-streaming.service.js';
import { GemService } from '../services/gem.service.js';

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

    // Use transaction to ensure atomicity and prevent race conditions
    if (existingReaction) {
      // If same reaction, delete it (toggle off)
      if (existingReaction.reactionType === reactionType) {
        await prisma.$transaction([
          prisma.userReaction.delete({
            where: { id: existingReaction.id },
          }),
          prisma.message.update({
            where: { id },
            data: isPositive
              ? { positiveReactionCount: { decrement: 1 } }
              : { negativeReactionCount: { decrement: 1 } },
          }),
        ]);

        return { success: true, removed: true };
      } else {
        // Change reaction
        await prisma.$transaction([
          prisma.userReaction.update({
            where: { id: existingReaction.id },
            data: { reactionType },
          }),
          prisma.message.update({
            where: { id },
            data: {
              positiveReactionCount: isPositive ? { increment: 1 } : { decrement: 1 },
              negativeReactionCount: isPositive ? { decrement: 1 } : { increment: 1 },
            },
          }),
        ]);

        return { success: true, changed: true, isPositive };
      }
    } else {
      // Create new reaction
      await prisma.$transaction([
        prisma.userReaction.create({
          data: {
            userId: request.user!.id,
            messageId: id,
            reactionType,
          },
        }),
        prisma.message.update({
          where: { id },
          data: isPositive
            ? { positiveReactionCount: { increment: 1 } }
            : { negativeReactionCount: { increment: 1 } },
        }),
      ]);

      return { success: true, created: true, isPositive };
    }
  });

  // Regenerate AI message
  server.post('/messages/:id/regenerate', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['Messages'],
      description: 'Regenerate AI response for a message with SSE streaming',
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
        properties: {
          hint: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { hint } = request.body as { hint?: string };

    // 1. Get message and verify ownership
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            character: {
              select: {
                id: true,
                name: true,
                data: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      return reply.status(404).send({ error: 'Message not found' });
    }

    if (message.room.userId !== request.user!.id) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    // Only allow regenerating assistant messages
    if (message.role !== 'assistant') {
      return reply.status(400).send({ error: 'Can only regenerate assistant messages' });
    }

    // 2. Get user's chosen model and check gem balance (Optimized: parallel queries)
    const [profile, defaultModel] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: request.user!.id },
        include: { chosenLlmModel: true, gemWallet: true },
      }),
      prisma.llmModel.findFirst({
        where: { isActive: true },
        orderBy: { gemCostPerMessage: 'asc' },
      }),
    ]);

    const model = profile?.chosenLlmModel || defaultModel;

    if (!model) {
      return reply.status(500).send({ error: 'No active models available' });
    }

    // Apply regenerate cost multiplier (default 1.0 = same cost)
    const REGENERATE_GEM_COST_MULTIPLIER = parseFloat(
      process.env.REGENERATE_GEM_COST_MULTIPLIER || '1.0'
    );
    const gemCost = Math.round(model.gemCostPerMessage * REGENERATE_GEM_COST_MULTIPLIER);

    // Check gem balance (Optimized: use wallet from profile query)
    const wallet = profile?.gemWallet;
    if (!wallet) {
      return reply.status(500).send({ error: 'Wallet not found' });
    }

    const totalGems = wallet.freeDailyGemAmount + wallet.freePromoGemAmount + wallet.paidGemAmount;
    if (totalGems < gemCost) {
      return reply.status(402).send({
        error: 'Insufficient gems',
        required: gemCost,
        available: totalGems,
      });
    }

    // 3. Save current content to MessageVersion
    await prisma.messageVersion.create({
      data: {
        messageId: message.id,
        content: message.content,
        versionNumber: message.versionNumber,
        modelSlug: message.modelSlug,
      },
    });

    // 4. Increment version number
    await prisma.message.update({
      where: { id: message.id },
      data: { versionNumber: { increment: 1 } },
    });

    // 5. Find the previous user message
    const previousUserMessage = await prisma.message.findFirst({
      where: {
        roomId: message.roomId,
        role: 'user',
        createdAt: { lt: message.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    const userMessageContent = previousUserMessage?.content || '';

    // 6. Build AI context
    const aiStreamingService = new AIStreamingService();
    const aiContext = await aiStreamingService.buildAIContext({
      characterId: message.room.characterId,
      personaId: message.room.personaId,
      roomId: message.roomId,
    });

    // Replace placeholders in user message and hint
    const processedContent = userMessageContent
      .replace(/\{\{userName\}\}/g, aiContext.personaName)
      .replace(/\{\{characterName\}\}/g, message.room.character.name)
      .replace(/\{\{user\}\}/g, aiContext.personaName)
      .replace(/\{\{char\}\}/g, message.room.character.name);

    const processedHint = hint
      ? hint
          .replace(/\{\{userName\}\}/g, aiContext.personaName)
          .replace(/\{\{characterName\}\}/g, message.room.character.name)
          .replace(/\{\{user\}\}/g, aiContext.personaName)
          .replace(/\{\{char\}\}/g, message.room.character.name)
      : undefined;

    // Debug log
    server.log.info({
      originalHint: hint,
      processedHint,
      personaName: aiContext.personaName,
      characterName: message.room.character.name
    }, 'Regenerate with hint');

    // 7. Stream AI response
    try {
      await aiStreamingService.streamAIResponse({
        userId: request.user!.id,
        roomId: message.roomId,
        messageId: message.id,
        userMessage: processedContent,
        hint: processedHint,
        modelSlug: model.slug,
        maxTokens: model.maxOutputTokens,
        characterContext: aiContext.characterContext,
        lorebookEntries: aiContext.lorebookEntries,
        situationalImagesInfo: aiContext.situationalImagesInfo,
        characterData: message.room.character.data, // Pass pre-loaded character data
        personaName: aiContext.personaName, // Pass persona name to avoid AI server DB query
        reply,
        server,
      });
    } catch (error) {
      server.log.error({ error }, 'Error regenerating message');

      if (!reply.raw.headersSent) {
        return reply.status(500).send({
          error: 'Failed to regenerate message',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  // Get message versions
  server.get('/messages/:id/versions', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['Messages'],
      description: 'Get all versions of a message',
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

    // 1. Get message and verify ownership
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

    // 2. Get all message versions
    const messageVersions = await prisma.messageVersion.findMany({
      where: { messageId: id },
      orderBy: { versionNumber: 'asc' },
    });

    // 3. Build versions array including current version
    const versions = [
      ...messageVersions.map((v: any) => ({
        versionNumber: v.versionNumber,
        content: v.content,
        modelSlug: v.modelSlug,
        createdAt: v.createdAt.toISOString(),
        isCurrent: false,
      })),
      {
        versionNumber: message.versionNumber,
        content: message.content,
        modelSlug: message.modelSlug,
        createdAt: message.updatedAt.toISOString(),
        isCurrent: true,
      },
    ];

    return {
      currentVersion: message.versionNumber,
      versions,
    };
  });
}
