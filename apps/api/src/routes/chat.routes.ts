import type { FastifyInstance } from 'fastify';
import { authenticateUser } from '../plugins/auth.js';
import { ChatService } from '../application/services/ChatService.js';
import { SendMessageDto } from '../application/dto/SendMessageDto.js';

/**
 * Chat Routes
 *
 * Phase 3 리팩토링: 비즈니스 로직을 ChatService로 이동
 * 256줄 → 50줄로 축소
 */
export async function chatRoutes(
  server: FastifyInstance,
  options: { chatService: ChatService }
) {
  const { chatService } = options;

  /**
   * POST /chat-rooms/:roomId/messages
   *
   * 채팅 메시지 전송 및 AI 응답 스트리밍 (SSE)
   */
  server.post(
    '/chat-rooms/:roomId/messages',
    {
      preHandler: [authenticateUser],
      config: {
        rateLimit: {
          max: 20, // 사용자당 20회 메시지/분
          timeWindow: '1 minute',
          keyGenerator: (request) => {
            // 사용자 ID 기반 레이트 리밋 (IP 대신)
            return (request as any).user?.id || request.ip;
          },
        },
      },
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
    },
    async (request, reply) => {
      const { roomId } = request.params as { roomId: string };
      const { content, hint } = request.body as { content?: string; hint?: string };

      const dto: SendMessageDto = {
        userId: request.user!.id,
        roomId,
        content,
        hint,
        reply,
      };

      try {
        await chatService.sendMessage(dto);
      } catch (error) {
        server.log.error({ error }, 'Error sending chat message');

        if (!reply.raw.headersSent) {
          if (error instanceof Error && error.message.includes('Insufficient gems')) {
            return reply.status(402).send({ error: error.message });
          }

          if (error instanceof Error && error.message.includes('not found')) {
            return reply.status(404).send({ error: error.message });
          }

          return reply.status(500).send({
            error: 'Failed to send message',
            details: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  );
}
