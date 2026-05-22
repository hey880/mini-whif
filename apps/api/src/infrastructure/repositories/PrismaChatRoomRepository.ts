import { PrismaClient, ChatRoom } from '@prisma/client';
import {
  IChatRoomRepository,
  FindChatRoomsParams,
  CreateChatRoomParams,
  ChatRoomWithRelations,
} from '../../domain/repositories/IChatRoomRepository.js';

/**
 * Prisma 기반 ChatRoom Repository 구현
 *
 * Infrastructure 레이어에서 Domain 레이어의 IChatRoomRepository 인터페이스를 구현합니다.
 * Prisma Client를 직접 사용하여 데이터베이스 작업을 수행합니다.
 */
export class PrismaChatRoomRepository implements IChatRoomRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string, userId: string): Promise<ChatRoomWithRelations | null> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            tagline: true,
          },
        },
        persona: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    // 권한 검증: 본인 방만 조회 가능
    if (!room || room.userId !== userId) {
      return null;
    }

    return room;
  }

  async findMany(params: FindChatRoomsParams): Promise<{
    rooms: ChatRoomWithRelations[];
    total: number;
  }> {
    const { userId, characterId, limit = 20, offset = 0 } = params;

    const where = {
      userId,
      ...(characterId && { characterId }),
    };

    const [rooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
        include: {
          character: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              tagline: true,
            },
          },
          persona: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
      this.prisma.chatRoom.count({ where }),
    ]);

    return { rooms, total };
  }

  async create(params: CreateChatRoomParams): Promise<ChatRoom> {
    const { userId, characterId, personaId, title, userNote } = params;

    return await this.prisma.chatRoom.create({
      data: {
        userId,
        characterId,
        personaId,
        title,
        userNote,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: Partial<Pick<ChatRoom, 'title' | 'userNote' | 'personaId'>>
  ): Promise<ChatRoom> {
    // 권한 검증: 본인 방만 수정 가능
    const room = await this.findById(id, userId);
    if (!room) {
      throw new Error('Chat room not found or forbidden');
    }

    return await this.prisma.chatRoom.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    // 권한 검증: 본인 방만 삭제 가능
    const room = await this.findById(id, userId);
    if (!room) {
      throw new Error('Chat room not found or forbidden');
    }

    await this.prisma.chatRoom.delete({
      where: { id },
    });
  }

  async cloneWithMessages(
    sourceRoomId: string,
    userId: string,
    newPersonaId?: string
  ): Promise<ChatRoom> {
    // Phase 1에서 최적화한 방식 적용: createMany 사용
    return await this.prisma.$transaction(async (tx) => {
      // 1. 원본 방 조회 (메시지 포함)
      const sourceRoom = await tx.chatRoom.findUnique({
        where: { id: sourceRoomId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      // 권한 검증
      if (!sourceRoom || sourceRoom.userId !== userId) {
        throw new Error('Source room not found or forbidden');
      }

      // 2. 새 방 생성
      const newRoom = await tx.chatRoom.create({
        data: {
          userId,
          characterId: sourceRoom.characterId,
          personaId: newPersonaId || sourceRoom.personaId,
          title: `${sourceRoom.title || 'Chat'} (Copy)`,
          userNote: sourceRoom.userNote,
        },
      });

      // 3. 메시지 일괄 복사 (Phase 1 최적화: N+1 쿼리 제거)
      if (sourceRoom.messages.length > 0) {
        await tx.message.createMany({
          data: sourceRoom.messages.map((msg) => ({
            roomId: newRoom.id,
            role: msg.role,
            content: msg.content,
            modelSlug: msg.modelSlug,
            metadata: msg.metadata as any,
            versionNumber: msg.versionNumber,
          })),
        });
      }

      return newRoom;
    });
  }
}
