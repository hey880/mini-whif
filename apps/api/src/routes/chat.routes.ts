import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authenticateUser } from '../plugins/auth.js';
import { prisma } from '../config/prisma.js';
import { GemService } from '../services/gem.service.js';

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
        required: ['content'],
        properties: {
          content: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { roomId } = request.params as { roomId: string };
    const { content } = request.body as { content: string };

    // 1. Verify room ownership
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { character: true },
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

    // 3. Save user message
    const userMessage = await prisma.message.create({
      data: {
        roomId,
        role: 'user',
        content,
      },
    });

    // 4. Create placeholder AI message
    const aiMessage = await prisma.message.create({
      data: {
        roomId,
        role: 'assistant',
        content: '',
        modelSlug: model.slug,
      },
    });

    // 5. Forward to AI server
    const aiServerUrl = process.env.AI_SERVER_URL || 'http://localhost:8000';

    try {
      const aiResponse = await fetch(`${aiServerUrl}/v1/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          user_id: request.user!.id,
          message: content,
          model_slug: model.slug,
          max_tokens: model.maxOutputTokens,
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

      // 6. Relay SSE events
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
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
                // 7. Update AI message in DB
                await prisma.message.update({
                  where: { id: aiMessage.id },
                  data: { content: accumulated },
                });

                // 8. Deduct gems
                await gemService.deductGems(request.user!.id, gemCost, aiMessage.id);

                // 9. Update chat room
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
