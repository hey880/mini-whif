import { Message, MessageVersion } from '@prisma/client';

/**
 * 메시지 조회 파라미터
 */
export interface FindMessagesByRoomParams {
  roomId: string;
  limit?: number;
  offset?: number;
}

/**
 * 메시지 페어 생성 파라미터 (user + AI placeholder)
 */
export interface CreateMessagePairParams {
  roomId: string;
  userContent: string;
  modelSlug: string;
  metadata?: any;
}

/**
 * 메시지 페어 결과
 */
export interface MessagePair {
  userMessage: Message;
  aiMessage: Message;
}

/**
 * Message Repository 인터페이스
 *
 * 메시지 CRUD 및 버저닝 로직을 담당합니다.
 */
export interface IMessageRepository {
  /**
   * ID로 메시지 조회
   * @param id 메시지 ID
   * @returns Message 또는 null
   */
  findById(id: string): Promise<Message | null>;

  /**
   * 채팅방의 메시지 목록 조회
   * @param params 조회 파라미터
   * @returns 메시지 목록 및 전체 개수
   */
  findByRoomId(params: FindMessagesByRoomParams): Promise<{
    messages: Message[];
    total: number;
  }>;

  /**
   * 단일 메시지 생성
   * @param data 메시지 데이터
   * @returns 생성된 Message
   */
  create(data: {
    roomId: string;
    role: 'user' | 'assistant';
    content: string;
    modelSlug?: string;
    metadata?: any;
  }): Promise<Message>;

  /**
   * 메시지 페어 생성 (user + AI placeholder)
   *
   * 채팅 전송 시 사용: 사용자 메시지와 AI 응답 플레이스홀더를 동시에 생성
   * @param params 생성 파라미터
   * @returns 사용자 메시지와 AI 메시지
   */
  createMessagePair(params: CreateMessagePairParams): Promise<MessagePair>;

  /**
   * 메시지 업데이트
   * @param id 메시지 ID
   * @param data 업데이트할 데이터
   * @returns 업데이트된 Message
   */
  update(
    id: string,
    data: Partial<Pick<Message, 'content' | 'metadata'>>
  ): Promise<Message>;

  /**
   * 메시지 삭제
   * @param id 메시지 ID
   */
  delete(id: string): Promise<void>;

  /**
   * 메시지 버전 목록 조회
   * @param messageId 메시지 ID
   * @returns 버전 목록
   */
  getVersions(messageId: string): Promise<MessageVersion[]>;

  /**
   * 현재 메시지를 버전으로 저장하고 버전 번호 증가
   * @param messageId 메시지 ID
   * @returns 생성된 버전
   */
  saveAsVersion(messageId: string): Promise<MessageVersion>;

  /**
   * 채팅방의 최근 메시지 조회
   * @param roomId 채팅방 ID
   * @param limit 가져올 메시지 개수 (기본값: 20)
   * @returns 최근 메시지 목록 (오래된 순)
   */
  findRecent(roomId: string, limit?: number): Promise<Message[]>;
}
