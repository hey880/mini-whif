import { FastifyReply } from 'fastify';

/**
 * 메시지 전송 DTO
 *
 * 채팅 메시지 전송 시 필요한 모든 데이터
 */
export interface SendMessageDto {
  /** 사용자 ID */
  userId: string;

  /** 채팅방 ID */
  roomId: string;

  /** 메시지 내용 (선택, hint만 있을 수 있음) */
  content?: string;

  /** AI 힌트 (사용자에게 보이지 않는 지시사항) */
  hint?: string;

  /** SSE 응답용 Reply 객체 */
  reply: FastifyReply;
}
