/**
 * VectorSearchRepository Interface
 *
 * pgvector를 사용한 벡터 유사도 검색 기능을 제공합니다.
 * RAG (검색 증강 생성)의 핵심 컴포넌트로, 과거 대화 기억을 검색합니다.
 */

export interface SimilarMessage {
  id: string;
  roomId: string;
  role: string;
  content: string;
  createdAt: Date;
  similarity: number; // 0-1 (1에 가까울수록 유사)
}

export interface ConversationMemoryResult {
  id: string;
  roomId: string;
  summary: string;
  messageRange: {
    startMessageId: string;
    endMessageId: string;
    count: number;
  };
  importance: number;
  createdAt: Date;
  similarity: number;
}

export interface SearchSimilarMessagesParams {
  roomId: string;
  queryEmbedding: number[];
  limit?: number;
  similarityThreshold?: number; // 0.7 권장
}

export interface SearchConversationMemoriesParams {
  roomId: string;
  queryEmbedding: number[];
  limit?: number;
  importanceWeight?: number; // 중요도 가중치 (0-1)
}

export interface SaveMessageEmbeddingParams {
  messageId: string;
  embedding: number[];
  model: string;
}

export interface IVectorSearchRepository {
  /**
   * 유사한 메시지 검색 (코사인 유사도 기반)
   */
  searchSimilarMessages(
    params: SearchSimilarMessagesParams
  ): Promise<SimilarMessage[]>;

  /**
   * 유사한 대화 요약 기억 검색
   * 중요도와 유사도를 결합하여 정렬
   */
  searchConversationMemories(
    params: SearchConversationMemoriesParams
  ): Promise<ConversationMemoryResult[]>;

  /**
   * 메시지 임베딩 저장
   */
  saveMessageEmbedding(params: SaveMessageEmbeddingParams): Promise<void>;

  /**
   * 임베딩이 없는 메시지 조회 (배치 작업용)
   */
  findMessagesWithoutEmbedding(params: {
    limit: number;
    daysAgo?: number;
  }): Promise<Array<{ id: string; content: string }>>;
}
