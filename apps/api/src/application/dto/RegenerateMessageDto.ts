import { FastifyReply } from 'fastify';

/**
 * 메시지 재생성 DTO
 */
export interface RegenerateMessageDto {
  /** 사용자 ID */
  userId: string;

  /** 재생성할 메시지 ID */
  messageId: string;

  /** SSE 응답용 Reply 객체 */
  reply: FastifyReply;
}

/**
 * Reaction 업데이트 DTO
 */
export interface UpdateReactionDto {
  /** 사용자 ID */
  userId: string;

  /** 메시지 ID */
  messageId: string;

  /** Positive (true) or Negative (false) */
  isPositive: boolean;
}
