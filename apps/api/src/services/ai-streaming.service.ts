import { prisma } from '../config/prisma.js';
import { replacePlaceholders } from '../utils/placeholder.js';
import { matchTriggeredImages } from '../utils/imageMatcher.js';
import { GemService } from './gem.service.js';
import type { FastifyInstance } from 'fastify';

interface CharacterContext {
  name: string;
  description: string;
  greeting: string;
  personality: string;
}

interface AIContextParams {
  characterId: string;
  personaId?: string | null;
  roomId: string;
}

interface StreamAIResponseParams {
  userId: string;
  roomId: string;
  messageId: string;
  userMessage: string;
  hint?: string;
  modelSlug: string;
  maxTokens: number;
  characterContext: CharacterContext;
  lorebookEntries: any[];
  situationalImagesInfo: any[];
  reply: any;
  server: FastifyInstance;
}

export class AIStreamingService {
  private gemService: GemService;

  constructor() {
    this.gemService = new GemService();
  }

  /**
   * Build AI context including character, persona, lorebook, and situational images
   */
  async buildAIContext(params: AIContextParams): Promise<{
    characterContext: CharacterContext;
    lorebookEntries: any[];
    situationalImagesInfo: any[];
    personaName: string;
  }> {
    // Get chat room with character details
    const room = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            description: true,
            greeting: true,
            tagline: true,
            lorebook: true,
            data: true,
          },
        },
      },
    });

    if (!room) {
      throw new Error('Chat room not found');
    }

    // Get persona name for placeholder replacement
    let personaName = '사용자';
    if (params.personaId) {
      const persona = await prisma.userPersona.findUnique({
        where: { id: params.personaId },
        select: { name: true },
      });
      if (persona) {
        personaName = persona.name;
      }
    }

    // Prepare placeholder replacements
    const replacements = {
      userName: personaName,
      characterName: room.character.name,
    };

    // Build character context with placeholders replaced
    const characterContext: CharacterContext = {
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
        console.warn('Failed to parse lorebook');
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
      console.warn('Failed to extract situational images');
    }

    return {
      characterContext,
      lorebookEntries,
      situationalImagesInfo,
      personaName,
    };
  }

  /**
   * Stream AI response and handle SSE relay, gem deduction, and metadata updates
   */
  async streamAIResponse(params: StreamAIResponseParams): Promise<void> {
    const aiServerUrl = process.env.AI_SERVER_URL || 'http://localhost:8000';
    const { server, reply } = params;

    // Get character data for situational images matching
    const room = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
      include: {
        character: {
          select: { data: true },
        },
      },
    });

    if (!room) {
      throw new Error('Chat room not found');
    }

    // Get model cost for gem deduction
    const model = await prisma.llmModel.findUnique({
      where: { slug: params.modelSlug },
    });

    if (!model) {
      throw new Error('Model not found');
    }

    const gemCost = model.gemCostPerMessage;

    try {
      const aiResponse = await fetch(`${aiServerUrl}/v1/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: params.roomId,
          user_id: params.userId,
          message: params.userMessage,
          hint: params.hint,
          model_slug: params.modelSlug,
          max_tokens: params.maxTokens,
          character: params.characterContext,
          lorebook_entries: params.lorebookEntries,
          situational_triggers: params.situationalImagesInfo,
        }),
      });

      if (!aiResponse.ok) {
        server.log.error(`AI server error: ${aiResponse.status} ${aiResponse.statusText}`);

        // If AI server unavailable, provide mock response
        const mockContent = `[Mock AI Response] Hello! The AI server is currently unavailable. This is a placeholder response. (Model: ${model.name}, Cost: ${gemCost} gems)`;

        // Update AI message with mock content
        await prisma.message.update({
          where: { id: params.messageId },
          data: { content: mockContent },
        });

        // Deduct gems
        await this.gemService.deductGems(params.userId, gemCost, params.messageId);

        // Update chat room
        await prisma.chatRoom.update({
          where: { id: params.roomId },
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

      // Relay SSE events
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
                // Match situational images
                let triggeredImages: any[] = [];
                try {
                  const characterData = room.character.data as any;
                  server.log.info({ characterData }, 'Character data');
                  if (characterData?.situationalImages) {
                    server.log.info({ situationalImages: characterData.situationalImages }, 'Situational images available');
                    triggeredImages = matchTriggeredImages(
                      accumulated,
                      characterData.situationalImages
                    );
                    server.log.info({ triggeredImages }, 'Triggered images result');
                  } else {
                    server.log.warn('No situational images in character data');
                  }
                } catch (e) {
                  server.log.error({ error: e }, 'Failed to match situational images');
                }

                // Update AI message in DB with triggered images
                await prisma.message.update({
                  where: { id: params.messageId },
                  data: {
                    content: accumulated,
                    metadata: {
                      triggeredImages,
                    },
                  },
                });

                // Deduct gems
                await this.gemService.deductGems(params.userId, gemCost, params.messageId);

                // Update chat room
                await prisma.chatRoom.update({
                  where: { id: params.roomId },
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
        throw error;
      }
    }
  }
}
