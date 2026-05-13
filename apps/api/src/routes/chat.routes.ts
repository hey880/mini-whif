import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authenticateUser } from '../plugins/auth.js';
import { prisma } from '../config/prisma.js';
import { GemService } from '../services/gem.service.js';
import { AIStreamingService } from '../services/ai-streaming.service.js';

export async function chatRoutes(server: FastifyInstance) {
  // Send a chat message with SSE streaming
  server.post('/chat-rooms/:roomId/messages', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['Chat'],
      description: 'Send a message to a chat room and stream AI response via SSE',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['roomId'],
        properties: {
          roomId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          hint: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { roomId } = request.params as { roomId: string };
    const { content, hint } = request.body as { content?: string; hint?: string };

    // 1. Verify room ownership
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            description: true,
            greeting: true,
            tagline: true,
            lorebook: true,
            data: true, // Includes situationalImages
          },
        },
      },
    });

    if (!room || room.userId !== request.user!.id) {
      return reply.status(404).send({ error: 'Chat room not found' });
    }

    // 2. Get user's current model and check gem balance
    const profile = await prisma.profile.findUnique({
      where: { id: request.user!.id },
      include: { chosenLlmModel: true, gemWallet: true },
    });

    // Get model (chosen or default to cheapest)
    let model = profile?.chosenLlmModel;
    if (!model) {
      model = await prisma.llmModel.findFirst({
        where: { isActive: true },
        orderBy: { gemCostPerMessage: 'asc' },
      });
    }

    if (!model) {
      return reply.status(500).send({ error: 'No active models available' });
    }

    const gemCost = model.gemCostPerMessage;

    // Check gem balance
    const gemService = new GemService();
    const balance = await gemService.getBalance(request.user!.id);

    if (balance.totalGems < gemCost) {
      return reply.status(402).send({
        error: 'Insufficient gems',
        required: gemCost,
        available: balance.totalGems,
      });
    }

    // 3. Save user message (only if not a hint-only request)
    let userMessage = null;
    if (!hint || content) {
      userMessage = await prisma.message.create({
        data: {
          roomId,
          role: 'user',
          content: content || '',
        },
      });
    }

    // 4. Create placeholder AI message
    const aiMessage = await prisma.message.create({
      data: {
        roomId,
        role: 'assistant',
        content: '',
        modelSlug: model.slug,
      },
    });

    // 5. Build AI context
    const aiStreamingService = new AIStreamingService();
    const aiContext = await aiStreamingService.buildAIContext({
      characterId: room.characterId,
      personaId: room.personaId,
      roomId,
    });

    // Replace placeholders in user message
    const replacements = {
      userName: aiContext.personaName,
      characterName: room.character.name,
    };

    const processedContent = content ? content.replace(/\{\{userName\}\}/g, aiContext.personaName).replace(/\{\{characterName\}\}/g, room.character.name) : '';
    const processedHint = hint ? hint.replace(/\{\{userName\}\}/g, aiContext.personaName).replace(/\{\{characterName\}\}/g, room.character.name) : undefined;

    // 6. Stream AI response
    try {
      await aiStreamingService.streamAIResponse({
        userId: request.user!.id,
        roomId,
        messageId: aiMessage.id,
        userMessage: processedContent,
        hint: processedHint,
        modelSlug: model.slug,
        maxTokens: model.maxOutputTokens,
        characterContext: aiContext.characterContext,
        lorebookEntries: aiContext.lorebookEntries,
        situationalImagesInfo: aiContext.situationalImagesInfo,
        reply,
        server,
      });
    } catch (error) {
      server.log.error({ error }, 'Error communicating with AI server');

      // Send error response
      if (!reply.raw.headersSent) {
        return reply.status(500).send({
          error: 'Failed to communicate with AI server',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });
}
