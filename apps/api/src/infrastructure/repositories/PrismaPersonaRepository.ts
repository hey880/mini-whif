import { PrismaClient, UserPersona } from '@prisma/client';
import {
  IPersonaRepository,
  FindPersonasParams,
  CreatePersonaParams,
} from '../../domain/repositories/IPersonaRepository.js';

/**
 * Prisma 기반 UserPersona Repository 구현
 */
export class PrismaPersonaRepository implements IPersonaRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string, userId: string): Promise<UserPersona | null> {
    const persona = await this.prisma.userPersona.findUnique({
      where: { id },
    });

    // 권한 검증: 본인 페르소나만 조회 가능
    if (!persona || persona.userId !== userId) {
      return null;
    }

    return persona;
  }

  async findMany(params: FindPersonasParams): Promise<{
    personas: UserPersona[];
    total: number;
  }> {
    const { userId, limit = 20, offset = 0 } = params;

    const where = { userId };

    const [personas, total] = await Promise.all([
      this.prisma.userPersona.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.userPersona.count({ where }),
    ]);

    return { personas, total };
  }

  async findDefault(userId: string): Promise<UserPersona | null> {
    return await this.prisma.userPersona.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });
  }

  async create(params: CreatePersonaParams): Promise<UserPersona> {
    const { userId, name, description, avatarUrl, isDefault, data } = params;

    // 기본 페르소나로 설정하는 경우, 기존 기본 페르소나 해제
    if (isDefault) {
      await this.prisma.userPersona.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return await this.prisma.userPersona.create({
      data: {
        userId,
        name,
        description,
        avatarUrl,
        isDefault: isDefault || false,
        data: data || {},
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: Partial<CreatePersonaParams>
  ): Promise<UserPersona> {
    // 권한 검증: 본인 페르소나만 수정 가능
    const persona = await this.findById(id, userId);
    if (!persona) {
      throw new Error('Persona not found or forbidden');
    }

    // 기본 페르소나로 변경하는 경우
    if (data.isDefault) {
      await this.prisma.userPersona.updateMany({
        where: {
          userId,
          isDefault: true,
          id: { not: id }, // 현재 페르소나 제외
        },
        data: {
          isDefault: false,
        },
      });
    }

    return await this.prisma.userPersona.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.data && { data: data.data }),
      },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    // 권한 검증: 본인 페르소나만 삭제 가능
    const persona = await this.findById(id, userId);
    if (!persona) {
      throw new Error('Persona not found or forbidden');
    }

    await this.prisma.userPersona.delete({
      where: { id },
    });
  }

  async setDefault(id: string, userId: string): Promise<UserPersona> {
    return await this.prisma.$transaction(async (tx) => {
      // 권한 검증
      const persona = await tx.userPersona.findUnique({
        where: { id },
      });

      if (!persona || persona.userId !== userId) {
        throw new Error('Persona not found or forbidden');
      }

      // 기존 기본 페르소나 해제
      await tx.userPersona.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });

      // 새 기본 페르소나 설정
      return await tx.userPersona.update({
        where: { id },
        data: {
          isDefault: true,
        },
      });
    });
  }
}
