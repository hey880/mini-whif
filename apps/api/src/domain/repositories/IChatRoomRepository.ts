import { ChatRoom, Character, UserPersona } from '@prisma/client';

/**
 * ChatRoom 조회 파라미터
 */
export interface FindChatRoomsParams {
  userId: string;
  characterId?: string;
  limit?: number;
  offset?: number;
}

/**
 * ChatRoom 생성 파라미터
 */
export interface CreateChatRoomParams {
  userId: string;
  characterId: string;
  personaId?: string;
  title?: string;
  userNote?: string;
}

/**
 * ChatRoom 응답 타입 (관계 포함)
 */
export interface ChatRoomWithRelations extends ChatRoom {
  character?: Partial<Character> | null;
  persona?: Partial<UserPersona> | null;
  _count?: {
    messages: number;
  };
}

/**
 * ChatRoom Repository 인터페이스
 *
 * Domain 레이어의 추상 인터페이스로, 데이터 접근 방법을 정의합니다.
 * 실제 구현은 Infrastructure 레이어의 PrismaChatRoomRepository에서 담당합니다.
 */
export interface IChatRoomRepository {
  /**
   * ID로 ChatRoom 조회
   * @param id 채팅방 ID
   * @param userId 사용자 ID (권한 검증용)
   * @returns ChatRoom 또는 null
   */
  findById(id: string, userId: string): Promise<ChatRoomWithRelations | null>;

  /**
   * 여러 ChatRoom 조회 (페이지네이션)
   * @param params 조회 파라미터
   * @returns 채팅방 목록 및 전체 개수
   */
  findMany(params: FindChatRoomsParams): Promise<{
    rooms: ChatRoomWithRelations[];
    total: number;
  }>;

  /**
   * ChatRoom 생성
   * @param params 생성 파라미터
   * @returns 생성된 ChatRoom
   */
  create(params: CreateChatRoomParams): Promise<ChatRoom>;

  /**
   * ChatRoom 업데이트
   * @param id 채팅방 ID
   * @param userId 사용자 ID (권한 검증용)
   * @param data 업데이트할 데이터
   * @returns 업데이트된 ChatRoom
   */
  update(
    id: string,
    userId: string,
    data: Partial<Pick<ChatRoom, 'title' | 'userNote' | 'personaId'>>
  ): Promise<ChatRoom>;

  /**
   * ChatRoom 삭제
   * @param id 채팅방 ID
   * @param userId 사용자 ID (권한 검증용)
   */
  delete(id: string, userId: string): Promise<void>;

  /**
   * ChatRoom 복제 (메시지 포함)
   *
   * Phase 1에서 최적화된 createMany 방식 사용
   * @param sourceRoomId 원본 채팅방 ID
   * @param userId 사용자 ID (권한 검증용)
   * @param newPersonaId 새 페르소나 ID (선택)
   * @returns 복제된 ChatRoom
   */
  cloneWithMessages(
    sourceRoomId: string,
    userId: string,
    newPersonaId?: string
  ): Promise<ChatRoom>;
}
