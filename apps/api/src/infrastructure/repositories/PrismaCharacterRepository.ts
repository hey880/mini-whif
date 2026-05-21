import { PrismaClient, Character } from '@prisma/client';
import {
  ICharacterRepository,
  FindCharactersParams,
  CreateCharacterParams,
  CharacterWithRelations,
  CharacterDetail,
} from '../../domain/repositories/ICharacterRepository.js';

/**
 * Prisma 기반 Character Repository 구현
 */
export class PrismaCharacterRepository implements ICharacterRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<CharacterDetail | null> {
    return await this.prisma.character.findUnique({
      where: { id },
      include: {
        universe: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findMany(params: FindCharactersParams): Promise<{
    characters: CharacterWithRelations[];
    total: number;
  }> {
    const { keyword, universeId, visibility, creatorId, limit = 16, offset = 0 } = params;

    // Build where clause
    const where: any = {};

    if (visibility) {
      where.visibility = visibility;
    }

    if (creatorId) {
      where.creatorId = creatorId;
    }

    if (universeId) {
      where.universeId = universeId;
    }

    // Keyword search across multiple fields
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { tagline: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { keywords: { has: keyword } },
      ];
    }

    // Phase 1 최적화: select로 data, lorebook 제외
    const [characters, total] = await Promise.all([
      this.prisma.character.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          tagline: true,
          description: true,
          greeting: true,
          imageUrl: true,
          bannerImageUrl: true,
          visibility: true,
          isNsfw: true,
          creatorId: true,
          universeId: true,
          keywords: true,
          createdAt: true,
          updatedAt: true,
          universe: {
            select: {
              id: true,
              name: true,
            },
          },
          creator: {
            select: {
              id: true,
              displayName: true,
            },
          },
          _count: {
            select: {
              chatRooms: true,
            },
          },
        },
      }),
      this.prisma.character.count({ where }),
    ]);

    return { characters, total };
  }

  async create(params: CreateCharacterParams): Promise<Character> {
    return await this.prisma.character.create({
      data: {
        name: params.name,
        creatorId: params.creatorId,
        tagline: params.tagline,
        description: params.description,
        greeting: params.greeting,
        imageUrl: params.imageUrl,
        bannerImageUrl: params.bannerImageUrl,
        visibility: params.visibility,
        isNsfw: params.isNsfw,
        universeId: params.universeId,
        keywords: params.keywords || [],
        data: params.data,
        lorebook: params.lorebook,
      },
    });
  }

  async update(
    id: string,
    creatorId: string,
    data: Partial<CreateCharacterParams>
  ): Promise<Character> {
    // 권한 검증: 제작자만 수정 가능
    const character = await this.prisma.character.findUnique({
      where: { id },
    });

    if (!character || character.creatorId !== creatorId) {
      throw new Error('Character not found or forbidden');
    }

    return await this.prisma.character.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.tagline !== undefined && { tagline: data.tagline }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.greeting !== undefined && { greeting: data.greeting }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.bannerImageUrl !== undefined && { bannerImageUrl: data.bannerImageUrl }),
        ...(data.visibility && { visibility: data.visibility }),
        ...(data.isNsfw !== undefined && { isNsfw: data.isNsfw }),
        ...(data.universeId !== undefined && { universeId: data.universeId }),
        ...(data.keywords && { keywords: data.keywords }),
        ...(data.data && { data: data.data }),
        ...(data.lorebook !== undefined && { lorebook: data.lorebook }),
      },
    });
  }

  async delete(id: string, creatorId: string): Promise<void> {
    // 권한 검증: 제작자만 삭제 가능
    const character = await this.prisma.character.findUnique({
      where: { id },
    });

    if (!character || character.creatorId !== creatorId) {
      throw new Error('Character not found or forbidden');
    }

    await this.prisma.character.delete({
      where: { id },
    });
  }
}
