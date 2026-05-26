import OpenAI from 'openai';
import type { PrismaClient } from '@prisma/client';

interface EmbeddingConfig {
  model: string;
  dimensions: number;
  maxBatchSize: number;
  rateLimitMs: number;
}

interface MessageEmbeddingParams {
  messageId: string;
  content: string;
}

interface ConversationMemoryParams {
  roomId: string;
  summary: string;
  messageRange: {
    startMessageId: string;
    endMessageId: string;
    count: number;
  };
  importance: number;
}

/**
 * EmbeddingService
 *
 * OpenAI text-embedding-3-small API를 사용하여 메시지와 대화 요약의 임베딩 생성
 *
 * 주요 기능:
 * - 메시지 임베딩 비동기 생성
 * - 대화 요약 기억 생성
 * - 배치 처리 및 rate limiting
 * - Graceful error handling
 */
export class EmbeddingService {
  private openai: OpenAI;
  private prisma: PrismaClient;
  private config: EmbeddingConfig;

  constructor(prisma: PrismaClient, apiKey?: string) {
    this.prisma = prisma;
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });

    this.config = {
      model: 'text-embedding-3-small',
      dimensions: 1536,
      maxBatchSize: 100, // OpenAI 배치 크기 제한
      rateLimitMs: 100, // Rate limiting: 100ms 간격
    };
  }

  /**
   * 텍스트를 임베딩 벡터로 변환
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.config.model,
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('[EmbeddingService] Failed to generate embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * 메시지 임베딩을 비동기적으로 생성하고 저장
   */
  async embedMessageAsync(messageId: string, content: string): Promise<void> {
    try {
      // Rate limiting
      await this.sleep(this.config.rateLimitMs);

      const embedding = await this.generateEmbedding(content);

      // 임베딩을 DB에 저장 (pgvector)
      await this.prisma.$executeRaw`
        UPDATE messages
        SET embedding = ${JSON.stringify(embedding)}::vector,
            embedding_model = ${this.config.model},
            embedded_at = NOW()
        WHERE id = ${messageId}::uuid
      `;

      console.log(`[EmbeddingService] Embedded message ${messageId}`);
    } catch (error) {
      console.error(`[EmbeddingService] Failed to embed message ${messageId}:`, error);
      // Graceful degradation: 실패해도 메시지는 유지됨
    }
  }

  /**
   * 여러 메시지의 임베딩을 배치로 생성
   */
  async embedMessageBatch(messages: MessageEmbeddingParams[]): Promise<void> {
    const batches = this.chunk(messages, this.config.maxBatchSize);

    for (const batch of batches) {
      try {
        // 배치 임베딩 생성
        const contents = batch.map((m) => m.content);
        const response = await this.openai.embeddings.create({
          model: this.config.model,
          input: contents,
          encoding_format: 'float',
        });

        // 각 메시지에 임베딩 저장
        for (let i = 0; i < batch.length; i++) {
          const messageId = batch[i].messageId;
          const embedding = response.data[i].embedding;

          await this.prisma.$executeRaw`
            UPDATE messages
            SET embedding = ${JSON.stringify(embedding)}::vector,
                embedding_model = ${this.config.model},
                embedded_at = NOW()
            WHERE id = ${messageId}::uuid
          `;
        }

        console.log(`[EmbeddingService] Embedded batch of ${batch.length} messages`);

        // Rate limiting
        await this.sleep(this.config.rateLimitMs);
      } catch (error) {
        console.error('[EmbeddingService] Failed to embed batch:', error);
        // 배치 실패 시 개별 처리로 fallback
        for (const msg of batch) {
          await this.embedMessageAsync(msg.messageId, msg.content);
        }
      }
    }
  }

  /**
   * 대화 요약 기억 생성 (10개 메시지마다)
   *
   * @param roomId 채팅방 ID
   * @returns 생성된 기억 ID 또는 null
   */
  async createConversationMemory(roomId: string): Promise<string | null> {
    try {
      // 가장 최근 임베딩된 메시지 10개 가져오기
      const messages = await this.prisma.message.findMany({
        where: {
          roomId,
          embeddedAt: { not: null }, // Use embeddedAt instead of embedding
          role: { in: ['user', 'assistant'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
          positiveReactionCount: true,
          negativeReactionCount: true,
        },
      });

      if (messages.length < 5) {
        // 최소 5개 메시지 필요
        return null;
      }

      // 대화 요약 생성 (간단한 템플릿)
      const summary = this.generateConversationSummary(messages);

      // 요약 임베딩 생성
      const embedding = await this.generateEmbedding(summary);

      // 중요도 계산 (사용자 반응 기반)
      const importance = this.calculateImportance(messages);

      // ConversationMemory 저장
      const memory = await this.prisma.$executeRaw`
        INSERT INTO conversation_memories (room_id, summary, embedding, message_range, importance, updated_at)
        VALUES (
          ${roomId}::uuid,
          ${summary},
          ${JSON.stringify(embedding)}::vector,
          ${JSON.stringify({
            startMessageId: messages[messages.length - 1].id,
            endMessageId: messages[0].id,
            count: messages.length,
          })}::jsonb,
          ${importance},
          CURRENT_TIMESTAMP
        )
        RETURNING id
      `;

      console.log(`[EmbeddingService] Created conversation memory for room ${roomId}`);
      return roomId; // Simplified return
    } catch (error) {
      console.error(`[EmbeddingService] Failed to create conversation memory:`, error);
      return null;
    }
  }

  /**
   * 대화 요약 생성 (템플릿 기반)
   */
  private generateConversationSummary(
    messages: Array<{
      role: string;
      content: string;
      createdAt: Date;
    }>
  ): string {
    // 역순으로 정렬 (시간순)
    const sortedMessages = [...messages].reverse();

    // 요약 생성
    const lines = sortedMessages.map((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      const content = msg.content.substring(0, 200); // 최대 200자
      return `${role}: ${content}`;
    });

    return lines.join('\n');
  }

  /**
   * 중요도 계산 (1-10)
   * 사용자 반응 기반
   */
  private calculateImportance(
    messages: Array<{
      positiveReactionCount: number;
      negativeReactionCount: number;
    }>
  ): number {
    let totalReactions = 0;
    let positiveRatio = 0;

    for (const msg of messages) {
      const total = msg.positiveReactionCount + msg.negativeReactionCount;
      totalReactions += total;
      if (total > 0) {
        positiveRatio += msg.positiveReactionCount / total;
      }
    }

    // 기본 중요도: 5
    let importance = 5;

    // 반응이 많으면 중요도 증가
    if (totalReactions >= 5) importance += 2;
    else if (totalReactions >= 2) importance += 1;

    // 긍정 비율이 높으면 중요도 증가
    if (positiveRatio / messages.length > 0.7) importance += 2;
    else if (positiveRatio / messages.length > 0.5) importance += 1;

    return Math.min(10, Math.max(1, importance));
  }

  /**
   * 배열을 청크로 분할
   */
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Sleep 유틸리티
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
