import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authenticateUser } from '../plugins/auth.js';
import { prisma } from '../config/prisma.js';
import { GemService } from '../services/gem.service.js';
import { replacePlaceholders } from '../utils/placeholder.js';
import { matchTriggeredImages } from '../utils/imageMatcher.js';

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

    // 5. Get persona name for placeholder replacement
    let personaName = '사용자';
    if (room.personaId) {
      const persona = await prisma.userPersona.findUnique({
        where: { id: room.personaId },
        select: { name: true },
      });
      if (persona) {
        personaName = persona.name;
      }
    }

    // 6. Prepare character context with placeholder replacement
    const replacements = {
      userName: personaName,
      characterName: room.character.name,
    };

    const characterContext = {
      name: room.character.name,
      description: replacePlaceholders(room.character.description || '', replacements),
      greeting: replacePlaceholders(room.character.greeting || '', replacements),
      personality: replacePlaceholders(room.character.tagline || '', replacements),
    };

    // Parse lorebook if exists
    let lorebookEntries: any[] = [];
    if (room.character.lorebook) {
      try {
        const lorebook = typeof room.character.lorebook === 'string'
          ? JSON.parse(room.character.lorebook)
          : room.character.lorebook;
        lorebookEntries = lorebook.entries || [];
      } catch (e) {
        server.log.warn('Failed to parse lorebook');
      }
    }

    // Extract situational images for AI context
    let situationalImagesInfo: any[] = [];
    try {
      const characterData = room.character.data as any;
      if (characterData?.situationalImages) {
        // Send only triggers and description to AI (not imageUrl)
        situationalImagesInfo = characterData.situationalImages.map((img: any) => ({
          triggers: img.triggers,
          description: img.description,
        }));
      }
    } catch (e) {
      server.log.warn('Failed to extract situational images');
    }

    // Replace placeholders in user message (so AI understands context)
    const processedContent = content ? replacePlaceholders(content, replacements) : '';
    const processedHint = hint ? replacePlaceholders(hint, replacements) : undefined;

    // 7. Forward to AI server
    const aiServerUrl = process.env.AI_SERVER_URL || 'http://localhost:8000';

    try {
      const aiResponse = await fetch(`${aiServerUrl}/v1/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          user_id: request.user!.id,
          message: processedContent,
          hint: processedHint,
          model_slug: model.slug,
          max_tokens: model.maxOutputTokens,
          character: characterContext,
          lorebook_entries: lorebookEntries,
          situational_triggers: situationalImagesInfo,
        }),
      });

      if (!aiResponse.ok) {
        server.log.error(`AI server error: ${aiResponse.status} ${aiResponse.statusText}`);

        // If AI server unavailable, provide mock response
        const mockContent = `[Mock AI Response] Hello! The AI server is currently unavailable. This is a placeholder response. (Model: ${model.name}, Cost: ${gemCost} gems)`;

        // Update AI message with mock content
        await prisma.message.update({
          where: { id: aiMessage.id },
          data: { content: mockContent },
        });

        // Deduct gems
        await gemService.deductGems(request.user!.id, gemCost, aiMessage.id);

        // Update chat room
        await prisma.chatRoom.update({
          where: { id: roomId },
          data: { lastMessageAt: new Date() },
        });

        // Send mock SSE response
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        });

        reply.raw.write(`data: ${JSON.stringify({
          event_id: 0,
          content: mockContent,
          is_final_event: true,
          model: model.slug,
        })}\n\n`);

        reply.raw.end();
        return;
      }

      // 8. Relay SSE events
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
        'Access-Control-Allow-Credentials': 'true',
      });

      const reader = aiResponse.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        reply.raw.write(chunk); // Forward to client

        // Parse to check for final event
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              accumulated = data.content;

              if (data.is_final_event) {
                // 7. Match situational images
                let triggeredImages: any[] = [];
                try {
                  const characterData = room.character.data as any;
                  server.log.info('Character data:', characterData);
                  if (characterData?.situationalImages) {
                    server.log.info('Situational images available:', characterData.situationalImages);
                    triggeredImages = matchTriggeredImages(
                      accumulated,
                      characterData.situationalImages
                    );
                    server.log.info('Triggered images result:', triggeredImages);
                  } else {
                    server.log.warn('No situational images in character data');
                  }
                } catch (e) {
                  server.log.error('Failed to match situational images:', e);
                }

                // 8. Update AI message in DB with triggered images
                await prisma.message.update({
                  where: { id: aiMessage.id },
                  data: {
                    content: accumulated,
                    metadata: {
                      triggeredImages,
                    },
                  },
                });

                // 9. Deduct gems
                await gemService.deductGems(request.user!.id, gemCost, aiMessage.id);

                // 10. Update chat room
                await prisma.chatRoom.update({
                  where: { id: roomId },
                  data: { lastMessageAt: new Date() },
                });
              }
            } catch (parseError) {
              server.log.error({ error: parseError }, 'Error parsing SSE data');
            }
          }
        }
      }

      reply.raw.end();
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
