import { PrismaClient } from '@prisma/client';
import { EmbeddingService } from '../application/services/EmbeddingService.js';
import { PrismaVectorSearchRepository } from '../infrastructure/repositories/PrismaVectorSearchRepository.js';

const prisma = new PrismaClient();

/**
 * Embedding Batch Job
 *
 * 매일 자정에 실행되어 다음 작업을 수행합니다:
 * 1. 임베딩이 누락된 메시지 처리 (최근 7일, 1000개씩)
 * 2. 대화 요약 기억 생성 (최근 24시간 활동 채팅방)
 *
 * Cron 스케줄: 0 0 * * * (매일 자정)
 */
export async function runEmbeddingBatch(): Promise<void> {
  console.log('[EmbeddingBatch] Starting embedding batch job...');

  const embeddingService = new EmbeddingService(prisma);
  const vectorSearchRepo = new PrismaVectorSearchRepository(prisma);

  try {
    // ============================================
    // 1. 임베딩 누락 메시지 처리
    // ============================================
    console.log('[EmbeddingBatch] Step 1: Processing messages without embeddings...');

    const messagesWithoutEmbedding = await vectorSearchRepo.findMessagesWithoutEmbedding({
      limit: 1000,
      daysAgo: 7, // 최근 7일만
    });

    console.log(`[EmbeddingBatch] Found ${messagesWithoutEmbedding.length} messages without embeddings`);

    if (messagesWithoutEmbedding.length > 0) {
      await embeddingService.embedMessageBatch(
        messagesWithoutEmbedding.map((msg) => ({
          messageId: msg.id,
          content: msg.content,
        }))
      );

      console.log(`[EmbeddingBatch] Embedded ${messagesWithoutEmbedding.length} messages`);
    }

    // ============================================
    // 2. 대화 요약 기억 생성 (활성 채팅방)
    // ============================================
    console.log('[EmbeddingBatch] Step 2: Creating conversation memories...');

    // 최근 24시간 동안 활동이 있는 채팅방 조회
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);

    const activeChatRooms = await prisma.chatRoom.findMany({
      where: {
        lastMessageAt: {
          gte: cutoffDate,
        },
      },
      select: {
        id: true,
      },
    });

    console.log(`[EmbeddingBatch] Found ${activeChatRooms.length} active chat rooms`);

    let memoriesCreated = 0;

    for (const room of activeChatRooms) {
      try {
        // 채팅방에 임베딩된 메시지가 10개 이상 있는지 확인
        const embeddedMessageCount = await prisma.message.count({
          where: {
            roomId: room.id,
            embeddedAt: { not: null }, // Use embeddedAt instead of embedding
            role: { in: ['user', 'assistant'] },
          },
        });

        // 10개 미만이면 스킵
        if (embeddedMessageCount < 10) {
          continue;
        }

        // 대화 요약 기억 생성
        const memoryId = await embeddingService.createConversationMemory(room.id);

        if (memoryId) {
          memoriesCreated++;
        }

        // Rate limiting (OpenAI API)
        await sleep(500);
      } catch (error) {
        console.error(`[EmbeddingBatch] Failed to create memory for room ${room.id}:`, error);
        // Continue with next room
      }
    }

    console.log(`[EmbeddingBatch] Created ${memoriesCreated} conversation memories`);

    // ============================================
    // 3. 통계 출력
    // ============================================
    const totalEmbeddedMessages = await prisma.message.count({
      where: {
        embeddedAt: { not: null }, // Use embeddedAt instead of embedding
      },
    });

    const totalConversationMemories = await prisma.$executeRaw`
      SELECT COUNT(*) FROM conversation_memories
    `;

    console.log('[EmbeddingBatch] Batch job completed successfully!');
    console.log(`[EmbeddingBatch] Statistics:`);
    console.log(`  - Total embedded messages: ${totalEmbeddedMessages}`);
    console.log(`  - Total conversation memories: ${totalConversationMemories}`);
  } catch (error) {
    console.error('[EmbeddingBatch] Batch job failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Sleep 유틸리티
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// CLI에서 직접 실행할 수 있도록
if (import.meta.url === `file://${process.argv[1]}`) {
  runEmbeddingBatch()
    .then(() => {
      console.log('[EmbeddingBatch] Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[EmbeddingBatch] Error:', error);
      process.exit(1);
    });
}
