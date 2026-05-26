import { PrismaClient } from '@prisma/client';
import { EmbeddingService } from '../application/services/EmbeddingService.js';
import { PrismaVectorSearchRepository } from '../infrastructure/repositories/PrismaVectorSearchRepository.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 로그 디렉토리 및 파일 설정
const LOG_DIR = path.join(__dirname, '../../../../logs/batch');
const LOG_FILE = path.join(LOG_DIR, 'embedding-batch.log');

// 로그 디렉토리 생성
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 간단한 로깅 헬퍼 (콘솔 + 파일 동시 출력)
const logger = {
  info: (msgOrObj: string | object, msg?: string) => {
    const timestamp = new Date().toISOString();
    let logLine: string;

    if (typeof msgOrObj === 'string') {
      logLine = JSON.stringify({ level: 'info', time: timestamp, msg: msgOrObj });
      console.log(`[${timestamp}] INFO: ${msgOrObj}`);
    } else {
      logLine = JSON.stringify({ level: 'info', time: timestamp, ...msgOrObj, msg });
      console.log(`[${timestamp}] INFO:`, msgOrObj, msg || '');
    }

    fs.appendFileSync(LOG_FILE, logLine + '\n');
  },

  error: (msgOrObj: { error?: any; [key: string]: any }, msg: string) => {
    const timestamp = new Date().toISOString();
    const logLine = JSON.stringify({
      level: 'error',
      time: timestamp,
      ...msgOrObj,
      msg,
      error: msgOrObj.error?.message || msgOrObj.error,
    });
    console.error(`[${timestamp}] ERROR:`, msgOrObj, msg);
    fs.appendFileSync(LOG_FILE, logLine + '\n');
  },
};

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
  logger.info('[EmbeddingBatch] Starting embedding batch job...');

  const embeddingService = new EmbeddingService(prisma);
  const vectorSearchRepo = new PrismaVectorSearchRepository(prisma);

  try {
    // ============================================
    // 1. 임베딩 누락 메시지 처리
    // ============================================
    logger.info('[EmbeddingBatch] Step 1: Processing messages without embeddings...');

    const messagesWithoutEmbedding = await vectorSearchRepo.findMessagesWithoutEmbedding({
      limit: 1000,
      daysAgo: 7, // 최근 7일만
    });

    logger.info(`[EmbeddingBatch] Found ${messagesWithoutEmbedding.length} messages without embeddings`);

    if (messagesWithoutEmbedding.length > 0) {
      await embeddingService.embedMessageBatch(
        messagesWithoutEmbedding.map((msg) => ({
          messageId: msg.id,
          content: msg.content,
        }))
      );

      logger.info(`[EmbeddingBatch] Embedded ${messagesWithoutEmbedding.length} messages`);
    }

    // ============================================
    // 2. 대화 요약 기억 생성 (활성 채팅방)
    // ============================================
    logger.info('[EmbeddingBatch] Step 2: Creating conversation memories...');

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

    logger.info(`[EmbeddingBatch] Found ${activeChatRooms.length} active chat rooms`);

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
        logger.error({ error, roomId: room.id }, '[EmbeddingBatch] Failed to create memory for room');
        // Continue with next room
      }
    }

    logger.info(`[EmbeddingBatch] Created ${memoriesCreated} conversation memories`);

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

    logger.info({
      totalEmbeddedMessages,
      totalConversationMemories,
      messagesProcessed: messagesWithoutEmbedding.length,
      memoriesCreated,
    }, '[EmbeddingBatch] Batch job completed successfully');
  } catch (error) {
    logger.error({ error }, '[EmbeddingBatch] Batch job failed');
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
// Windows 경로 호환성을 위해 fileURLToPath 사용
const isMainModule = fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  runEmbeddingBatch()
    .then(() => {
      logger.info('[EmbeddingBatch] Done!');
      // Flush logs before exit
      setTimeout(() => process.exit(0), 100);
    })
    .catch((error) => {
      logger.error({ error }, '[EmbeddingBatch] Error');
      // Flush logs before exit
      setTimeout(() => process.exit(1), 100);
    });
}
