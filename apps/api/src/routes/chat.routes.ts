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

    // 1. Parallel fetch: room + profile (OPTIMIZATION: reduced from 2 sequential queries)
    const [room, profile] = await Promise.all([
      prisma.chatRoom.findUnique({
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
              universeId: true,
              universe: {
                select: {
                  id: true,
                  name: true,
                  lorebook: true,
                },
              },
            },
          },
        },
      }),
      prisma.profile.findUnique({
        where: { id: request.user!.id },
        include: {
          chosenLlmModel: true,
          gemWallet: true, // OPTIMIZATION: pre-load for balance check
        },
      }),
    ]);

    // Verify room ownership
    if (!room || room.userId !== request.user!.id) {
      return reply.status(404).send({ error: 'Chat room not found' });
    }

    // 2. Get model (chosen or default to cheapest)
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

    // 3. Check gem balance (OPTIMIZATION: use pre-loaded gemWallet instead of separate query)
    const totalGems =
      (profile?.gemWallet?.paidGemAmount || 0) +
      (profile?.gemWallet?.freeDailyGemAmount || 0) +
      (profile?.gemWallet?.freePromoGemAmount || 0);

    if (totalGems < gemCost) {
      return reply.status(402).send({
        error: 'Insufficient gems',
        required: gemCost,
        available: totalGems,
      });
    }

    // 4. Fetch persona and save messages
    // OPTIMIZATION: removed buildAIContext() call (was doing redundant DB queries)
    const persona = room.personaId
      ? await prisma.userPersona.findUnique({
          where: { id: room.personaId },
          select: { name: true },
        })
      : null;

    // Save user message first (if provided)
    const userMessage = (!hint || content)
      ? await prisma.message.create({
          data: {
            roomId,
            role: 'user',
            content: content || '',
          },
        })
      : null;

    // Then create AI placeholder (IMPORTANT: sequential to preserve message order)
    const aiMessage = await prisma.message.create({
      data: {
        roomId,
        role: 'assistant',
        content: '',
        modelSlug: model.slug,
      },
    });

    // 5. Build AI context inline (OPTIMIZATION: no DB queries needed)
    const personaName = persona?.name || '사용자';

    // Prepare placeholder replacements
    const replacements = {
      userName: personaName,
      characterName: room.character.name,
    };

    // Build character context with placeholders replaced
    const characterContext = {
      name: room.character.name,
      description: (room.character.description || '').replace(/\{\{userName\}\}/g, personaName).replace(/\{\{characterName\}\}/g, room.character.name),
      greeting: (room.character.greeting || '').replace(/\{\{userName\}\}/g, personaName).replace(/\{\{characterName\}\}/g, room.character.name),
      personality: (room.character.tagline || '').replace(/\{\{userName\}\}/g, personaName).replace(/\{\{characterName\}\}/g, room.character.name),
    };

    // Parse and merge lorebooks (Universe + Character)
    let lorebookEntries: any[] = [];

    // Add Universe lorebook entries (if exists)
    if (room.character.universe?.lorebook) {
      try {
        const universeLorebook = typeof room.character.universe.lorebook === 'string'
          ? JSON.parse(room.character.universe.lorebook)
          : room.character.universe.lorebook;

        const universeEntries = (universeLorebook.entries || [])
          .map((entry: any) => ({
            ...entry,
            source: 'universe',
            universeName: room.character.universe?.name,
          }));

        lorebookEntries.push(...universeEntries);
      } catch (e) {
        server.log.warn({ error: e }, 'Failed to parse universe lorebook');
      }
    }

    // Add Character lorebook entries (if exists)
    if (room.character.lorebook) {
      try {
        const characterLorebook = typeof room.character.lorebook === 'string'
          ? JSON.parse(room.character.lorebook)
          : room.character.lorebook;

        const characterEntries = (characterLorebook.entries || [])
          .map((entry: any) => ({
            ...entry,
            source: 'character',
            characterName: room.character.name,
          }));

        lorebookEntries.push(...characterEntries);
      } catch (e) {
        server.log.warn({ error: e }, 'Failed to parse character lorebook');
      }
    }

    // Sort by priority (higher priority first)
    lorebookEntries.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Extract situational images for AI context
    let situationalImagesInfo: any[] = [];
    try {
      const characterData = room.character.data as any;
      if (characterData?.situationalImages) {
        situationalImagesInfo = characterData.situationalImages.map((img: any) => ({
          triggers: img.triggers,
          description: img.description,
        }));
      }
    } catch (e) {
      server.log.warn({ error: e }, 'Failed to extract situational images');
    }

    // Replace placeholders in user message
    const processedContent = content ? content.replace(/\{\{userName\}\}/g, personaName).replace(/\{\{characterName\}\}/g, room.character.name) : '';
    const processedHint = hint ? hint.replace(/\{\{userName\}\}/g, personaName).replace(/\{\{characterName\}\}/g, room.character.name) : undefined;

    // Log hint for debugging
    if (processedHint) {
      server.log.info({
        originalHint: hint,
        processedHint,
        personaName,
        characterName: room.character.name
      }, 'Chat message with hint');
    }

    // 6. Stream AI response (OPTIMIZATION: using pre-built context + persona name)
    const aiStreamingService = new AIStreamingService();
    try {
      await aiStreamingService.streamAIResponse({
        userId: request.user!.id,
        roomId,
        messageId: aiMessage.id,
        userMessage: processedContent,
        hint: processedHint,
        modelSlug: model.slug,
        maxTokens: model.maxOutputTokens,
        characterContext,
        lorebookEntries,
        situationalImagesInfo,
        characterData: room.character.data, // OPTIMIZATION: pass pre-loaded data
        personaName, // OPTIMIZATION: pass persona name to avoid AI server DB query
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
