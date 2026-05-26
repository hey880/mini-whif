import type { PrismaClient } from '@prisma/client';
import type {
  IVectorSearchRepository,
  SearchSimilarMessagesParams,
  SearchConversationMemoriesParams,
  SaveMessageEmbeddingParams,
  SimilarMessage,
  ConversationMemoryResult,
} from '../../domain/repositories/IVectorSearchRepository.js';

/**
 * PrismaVectorSearchRepository
 *
 * pgvector를 사용한 벡터 검색 구현체
 * HNSW 인덱스를 활용하여 빠른 유사도 검색 제공
 *
 * 성능 최적화:
 * - HNSW 인덱스 사용 (m=16, ef_construction=64)
 * - 코사인 유사도 연산자 (<=>)
 * - 유사도 임계값으로 결과 필터링
 */
export class PrismaVectorSearchRepository implements IVectorSearchRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * 임베딩 벡터 검증 및 안전한 문자열 변환
   * SQL 인젝션 방지를 위해 모든 요소가 유효한 숫자인지 확인
   */
  private validateAndStringifyEmbedding(embedding: unknown): string {
    if (!Array.isArray(embedding)) {
      throw new Error('Invalid embedding: must be an array');
    }

    if (embedding.length !== 1536) {
      throw new Error(
        `Invalid embedding: must have 1536 dimensions, got ${embedding.length}`
      );
    }

    // 모든 요소가 유효한 숫자인지 검증
    for (let i = 0; i < embedding.length; i++) {
      const value = embedding[i];
      if (typeof value !== 'number' || !isFinite(value)) {
        throw new Error(
          `Invalid embedding: element at index ${i} is not a valid number`
        );
      }
    }

    // 안전한 문자열 변환: 각 숫자를 직접 join
    return `[${embedding.join(',')]`;
  }

  /**
   * 유사한 메시지 검색
   *
   * pgvector의 코사인 거리 연산자(<=>)를 사용
   * 거리를 유사도로 변환: similarity = 1 - distance
   */
  async searchSimilarMessages(
    params: SearchSimilarMessagesParams
  ): Promise<SimilarMessage[]> {
    const {
      roomId,
      queryEmbedding,
      limit = 5,
      similarityThreshold = 0.7,
    } = params;

    try {
      // 임베딩 벡터 검증 및 안전한 문자열 변환
      const vectorString = this.validateAndStringifyEmbedding(queryEmbedding);

      // pgvector 쿼리: 코사인 유사도 기반 검색
      const results = await this.prisma.$queryRaw<
        Array<{
          id: string;
          room_id: string;
          role: string;
          content: string;
          created_at: Date;
          similarity: number;
        }>
      >`
        SELECT
          id,
          room_id,
          role,
          content,
          created_at,
          1 - (embedding <=> ${vectorString}::vector) AS similarity
        FROM messages
        WHERE
          room_id = ${roomId}::uuid
          AND embedding IS NOT NULL
          AND role IN ('user', 'assistant')
          AND 1 - (embedding <=> ${vectorString}::vector) >= ${similarityThreshold}
        ORDER BY embedding <=> ${vectorString}::vector
        LIMIT ${limit}
      `;

      return results.map((row) => ({
        id: row.id,
        roomId: row.room_id,
        role: row.role,
        content: row.content,
        createdAt: row.created_at,
        similarity: row.similarity,
      }));
    } catch (error) {
      console.error('[VectorSearchRepository] Failed to search similar messages:', error);
      return []; // Graceful degradation
    }
  }

  /**
   * 유사한 대화 요약 기억 검색
   *
   * 중요도와 유사도를 결합한 점수로 정렬:
   * score = similarity * (1 - importanceWeight) + (importance/10) * importanceWeight
   */
  async searchConversationMemories(
    params: SearchConversationMemoriesParams
  ): Promise<ConversationMemoryResult[]> {
    const {
      roomId,
      queryEmbedding,
      limit = 3,
      importanceWeight = 0.3, // 중요도 30%, 유사도 70%
    } = params;

    try {
      // 임베딩 벡터 검증 및 안전한 문자열 변환
      const vectorString = this.validateAndStringifyEmbedding(queryEmbedding);

      const results = await this.prisma.$queryRaw<
        Array<{
          id: string;
          room_id: string;
          summary: string;
          message_range: any;
          importance: number;
          created_at: Date;
          similarity: number;
          combined_score: number;
        }>
      >`
        SELECT
          id,
          room_id,
          summary,
          message_range,
          importance,
          created_at,
          1 - (embedding <=> ${vectorString}::vector) AS similarity,
          (1 - (embedding <=> ${vectorString}::vector)) * ${1 - importanceWeight} +
            (importance::float / 10) * ${importanceWeight} AS combined_score
        FROM conversation_memories
        WHERE
          room_id = ${roomId}::uuid
        ORDER BY combined_score DESC
        LIMIT ${limit}
      `;

      return results.map((row) => ({
        id: row.id,
        roomId: row.room_id,
        summary: row.summary,
        messageRange: row.message_range,
        importance: row.importance,
        createdAt: row.created_at,
        similarity: row.similarity,
      }));
    } catch (error) {
      console.error(
        '[VectorSearchRepository] Failed to search conversation memories:',
        error
      );
      return [];
    }
  }

  /**
   * 메시지 임베딩 저장
   */
  async saveMessageEmbedding(params: SaveMessageEmbeddingParams): Promise<void> {
    const { messageId, embedding, model } = params;

    try {
      // 임베딩 벡터 검증 및 안전한 문자열 변환
      const vectorString = this.validateAndStringifyEmbedding(embedding);

      await this.prisma.$executeRaw`
        UPDATE messages
        SET
          embedding = ${vectorString}::vector,
          embedding_model = ${model},
          embedded_at = NOW()
        WHERE id = ${messageId}::uuid
      `;
    } catch (error) {
      console.error('[VectorSearchRepository] Failed to save embedding:', error);
      throw new Error('Failed to save message embedding');
    }
  }

  /**
   * 임베딩이 없는 메시지 조회 (배치 작업용)
   */
  async findMessagesWithoutEmbedding(params: {
    limit: number;
    daysAgo?: number;
  }): Promise<Array<{ id: string; content: string }>> {
    const { limit, daysAgo = 7 } = params;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

      const messages = await this.prisma.message.findMany({
        where: {
          embeddedAt: null, // Use embeddedAt instead of embedding
          role: { in: ['user', 'assistant'] },
          createdAt: { gte: cutoffDate },
        },
        select: {
          id: true,
          content: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return messages;
    } catch (error) {
      console.error(
        '[VectorSearchRepository] Failed to find messages without embedding:',
        error
      );
      return [];
    }
  }
}
