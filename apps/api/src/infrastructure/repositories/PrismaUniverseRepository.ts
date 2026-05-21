import { PrismaClient, Universe } from '@prisma/client';
import {
  IUniverseRepository,
  FindUniversesParams,
  CreateUniverseParams,
  UniverseWithRelations,
  UniverseDetail,
} from '../../domain/repositories/IUniverseRepository.js';

/**
 * Prisma 기반 Universe Repository 구현
 */
export class PrismaUniverseRepository implements IUniverseRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<UniverseDetail | null> {
    return await this.prisma.universe.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            characters: true,
          },
        },
      },
    });
  }

  async findMany(params: FindUniversesParams): Promise<{
    universes: UniverseWithRelations[];
    total: number;
  }> {
    const { keyword, visibility, creatorId, limit = 16, offset = 0 } = params;

    // Build where clause
    const where: any = {};

    if (visibility) {
      where.visibility = visibility;
    }

    if (creatorId) {
      where.creatorId = creatorId;
    }

    // Keyword search across multiple fields
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { tags: { has: keyword } },
        { genre: { contains: keyword, mode: 'insensitive' } },
        { creator: { displayName: { contains: keyword, mode: 'insensitive' } } },
      ];
    }

    // Phase 1 최적화: select로 data, lorebook 제외
    const [universes, total] = await Promise.all([
      this.prisma.universe.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          creatorId: true,
          visibility: true,
          imageUrl: true,
          genre: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: {
              displayName: true,
            },
          },
          _count: {
            select: {
              characters: true,
            },
          },
        },
      }),
      this.prisma.universe.count({ where }),
    ]);

    return { universes, total };
  }

  async create(params: CreateUniverseParams): Promise<Universe> {
    return await this.prisma.universe.create({
      data: {
        name: params.name,
        creatorId: params.creatorId,
        description: params.description,
        imageUrl: params.imageUrl,
        visibility: params.visibility,
        genre: params.genre,
        tags: params.tags || [],
        data: params.data,
        lorebook: params.lorebook,
      },
    });
  }

  async update(
    id: string,
    creatorId: string,
    data: Partial<CreateUniverseParams>
  ): Promise<Universe> {
    // 권한 검증: 제작자만 수정 가능
    const universe = await this.prisma.universe.findUnique({
      where: { id },
    });

    if (!universe || universe.creatorId !== creatorId) {
      throw new Error('Universe not found or forbidden');
    }

    return await this.prisma.universe.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.visibility && { visibility: data.visibility }),
        ...(data.genre !== undefined && { genre: data.genre }),
        ...(data.tags && { tags: data.tags }),
        ...(data.data && { data: data.data }),
        ...(data.lorebook !== undefined && { lorebook: data.lorebook }),
      },
    });
  }

  async delete(id: string, creatorId: string): Promise<void> {
    // 권한 검증: 제작자만 삭제 가능
    const universe = await this.prisma.universe.findUnique({
      where: { id },
    });

    if (!universe || universe.creatorId !== creatorId) {
      throw new Error('Universe not found or forbidden');
    }

    await this.prisma.universe.delete({
      where: { id },
    });
  }
}
