import { PrismaClient, Message, MessageVersion } from '@prisma/client';
import {
  IMessageRepository,
  FindMessagesByRoomParams,
  CreateMessagePairParams,
  MessagePair,
} from '../../domain/repositories/IMessageRepository.js';

/**
 * Prisma 기반 Message Repository 구현
 */
export class PrismaMessageRepository implements IMessageRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Message | null> {
    return await this.prisma.message.findUnique({
      where: { id },
    });
  }

  async findByRoomId(params: FindMessagesByRoomParams): Promise<{
    messages: Message[];
    total: number;
  }> {
    const { roomId, limit = 50, offset = 0 } = params;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { roomId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.message.count({ where: { roomId } }),
    ]);

    return { messages, total };
  }

  async create(data: {
    roomId: string;
    role: 'user' | 'assistant';
    content: string;
    modelSlug?: string;
    metadata?: any;
  }): Promise<Message> {
    return await this.prisma.message.create({
      data: {
        roomId: data.roomId,
        role: data.role,
        content: data.content,
        modelSlug: data.modelSlug,
        metadata: data.metadata || {},
      },
    });
  }

  async createMessagePair(params: CreateMessagePairParams): Promise<MessagePair> {
    const { roomId, userContent, modelSlug, metadata } = params;

    // 트랜잭션으로 user + AI 메시지 동시 생성
    const [userMessage, aiMessage] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          roomId,
          role: 'user',
          content: userContent,
          metadata: metadata || {},
        },
      }),
      this.prisma.message.create({
        data: {
          roomId,
          role: 'assistant',
          content: '', // AI 응답 대기 중 (placeholder)
          modelSlug,
          metadata: metadata || {},
        },
      }),
    ]);

    return { userMessage, aiMessage };
  }

  async update(
    id: string,
    data: Partial<Pick<Message, 'content' | 'metadata'>>
  ): Promise<Message> {
    return await this.prisma.message.update({
      where: { id },
      data: data as any,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.message.delete({
      where: { id },
    });
  }

  async getVersions(messageId: string): Promise<MessageVersion[]> {
    return await this.prisma.messageVersion.findMany({
      where: { messageId },
      orderBy: { versionNumber: 'asc' },
    });
  }

  async saveAsVersion(messageId: string): Promise<MessageVersion> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. 현재 메시지 조회
      const message = await tx.message.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      // 2. 현재 내용을 버전으로 저장
      const version = await tx.messageVersion.create({
        data: {
          messageId: message.id,
          content: message.content,
          versionNumber: message.versionNumber,
          modelSlug: message.modelSlug,
        },
      });

      // 3. 메시지 버전 번호 증가
      await tx.message.update({
        where: { id: messageId },
        data: { versionNumber: { increment: 1 } },
      });

      return version;
    });
  }

  async findRecent(roomId: string, limit: number = 20): Promise<Message[]> {
    return await this.prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    }) as Message[];
  }
}
