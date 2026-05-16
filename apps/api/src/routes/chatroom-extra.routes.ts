import type { FastifyInstance } from 'fastify';
import { authenticateUser } from '../plugins/auth.js';
import { prisma } from '../config/prisma.js';
import { GemService } from '../services/gem.service.js';

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:8000';
const SUMMARY_GEM_COST = 50;
const USER_NOTE_EXTENSION_GEM_COST = 5;
const USER_NOTE_BASE_MAX_LENGTH = 500;
const USER_NOTE_EXTENDED_MAX_LENGTH = 1000;

export async function chatroomExtraRoutes(server: FastifyInstance) {
  // Generate conversation summary
  server.post('/chat-rooms/:roomId/summary', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['ChatRooms'],
      description: 'Generate AI summary of conversation (requires >= 40 messages, costs 50 gems)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['roomId'],
        properties: {
          roomId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { roomId } = request.params as { roomId: string };

    // 1. Verify room ownership
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        character: true,
      },
    });

    if (!room) {
      return reply.status(404).send({ error: 'Chat room not found' });
    }

    if (room.userId !== request.user!.id) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    // 2. Check message count (minimum 40)
    const messageCount = await prisma.message.count({
      where: { roomId },
    });

    if (messageCount < 40) {
      return reply.status(400).send({
        error: 'Not enough messages',
        required: 40,
        current: messageCount,
      });
    }

    // 3. Check gem balance
    const gemService = new GemService();
    const balance = await gemService.getBalance(request.user!.id);

    if (balance.totalGems < SUMMARY_GEM_COST) {
      return reply.status(402).send({
        error: 'Insufficient gems',
        required: SUMMARY_GEM_COST,
        available: balance.totalGems,
      });
    }

    // 4. Get all messages for summarization
    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        content: true,
        createdAt: true,
      },
    });

    // 5. Call OpenRouter directly to generate summary
    try {
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

      if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API key not configured');
      }

      const conversationText = messages
        .map(m => `${m.role === 'user' ? '사용자' : room.character.name}: ${m.content}`)
        .join('\n\n');

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
          'X-Title': 'Persona Chat',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-haiku',
          messages: [
            {
              role: 'system',
              content: `You are a conversation summarizer. Analyze the following chat conversation between a user and an AI character named "${room.character.name}".

Create a concise but comprehensive summary in Korean that captures:
1. 대화의 주요 주제
2. 공유된 중요 정보
3. 드러난 캐릭터 특성
4. 관계 역학
5. 중요한 사건이나 결정

2-3문단으로 요약하세요 (최대 500자). 나중에 대화를 이어가는 데 유용한 사실과 맥락에 집중하세요.`,
            },
            {
              role: 'user',
              content: `다음 대화를 요약해주세요:\n\n${conversationText}`,
            },
          ],
          max_tokens: 500,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      const summary = result.choices?.[0]?.message?.content;

      if (!summary?.trim()) {
        throw new Error('No summary generated');
      }

      // 6. Save summary to database
      await prisma.chatRoom.update({
        where: { id: roomId },
        data: { conversationSummary: summary.trim() },
      });

      // 7. Deduct gems
      await gemService.deductGems(request.user!.id, SUMMARY_GEM_COST);

      return {
        success: true,
        summary: summary.trim(),
        gemsDeducted: SUMMARY_GEM_COST,
        remainingGems: balance.totalGems - SUMMARY_GEM_COST,
      };
    } catch (error) {
      server.log.error({ error }, 'Failed to generate summary');
      return reply.status(500).send({
        error: 'Failed to generate summary',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Update user note
  server.patch('/chat-rooms/:roomId/user-note', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['ChatRooms'],
      description: 'Update user note for chat room (max 500 chars, or 1000 if extended)',
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
        required: ['note'],
        properties: {
          note: { type: 'string', maxLength: USER_NOTE_EXTENDED_MAX_LENGTH },
        },
      },
    },
  }, async (request, reply) => {
    const { roomId } = request.params as { roomId: string };
    const { note } = request.body as { note: string };

    // 1. Verify room ownership
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return reply.status(404).send({ error: 'Chat room not found' });
    }

    if (room.userId !== request.user!.id) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    // 2. Validate note length based on extension status
    const isExtended = (room.userNote?.length || 0) > USER_NOTE_BASE_MAX_LENGTH;
    const maxLength = isExtended ? USER_NOTE_EXTENDED_MAX_LENGTH : USER_NOTE_BASE_MAX_LENGTH;

    if (note.length > maxLength) {
      return reply.status(400).send({
        error: 'Note too long',
        maxLength,
        currentLength: note.length,
        isExtended,
      });
    }

    // 3. Update user note
    const updatedRoom = await prisma.chatRoom.update({
      where: { id: roomId },
      data: { userNote: note },
    });

    return {
      success: true,
      userNote: updatedRoom.userNote,
    };
  });

  // Extend user note to 1000 characters
  server.post('/chat-rooms/:roomId/user-note/extend', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['ChatRooms'],
      description: 'Extend user note limit to 1000 characters (costs 5 gems, one-time)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['roomId'],
        properties: {
          roomId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { roomId } = request.params as { roomId: string };

    // 1. Verify room ownership
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return reply.status(404).send({ error: 'Chat room not found' });
    }

    if (room.userId !== request.user!.id) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    // 2. Check if already extended (prevent double payment)
    const currentLength = room.userNote?.length || 0;
    if (currentLength > USER_NOTE_BASE_MAX_LENGTH) {
      return {
        success: true,
        alreadyExtended: true,
        message: 'User note already extended',
      };
    }

    // 3. Check gem balance
    const gemService = new GemService();
    const balance = await gemService.getBalance(request.user!.id);

    if (balance.totalGems < USER_NOTE_EXTENSION_GEM_COST) {
      return reply.status(402).send({
        error: 'Insufficient gems',
        required: USER_NOTE_EXTENSION_GEM_COST,
        available: balance.totalGems,
      });
    }

    // 4. Deduct gems
    await gemService.deductGems(request.user!.id, USER_NOTE_EXTENSION_GEM_COST);

    return {
      success: true,
      extended: true,
      gemsDeducted: USER_NOTE_EXTENSION_GEM_COST,
      remainingGems: balance.totalGems - USER_NOTE_EXTENSION_GEM_COST,
      newMaxLength: USER_NOTE_EXTENDED_MAX_LENGTH,
    };
  });
}
