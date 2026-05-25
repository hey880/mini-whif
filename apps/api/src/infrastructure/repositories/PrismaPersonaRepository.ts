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
    const { userId, limit = 20, offset = 0, excludeCharacterBased = false } = params;

    const where: any = { userId };
    if (excludeCharacterBased) {
      where.sourceCharacterId = null;
    }

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
    const { userId, name, persona, gender, sourceCharacterId, isDefault } = params;

    // 기본 페르소나로 설정하는 경우, 기존 기본 페르소나 해제
    if (isDefault) {
      await this.prisma.userPersona.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return await this.prisma.userPersona.create({
      data: {
        userId,
        name,
        persona: persona || '',
        gender: gender || undefined,
        sourceCharacterId: sourceCharacterId || undefined,
        isDefault: isDefault || false,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: Partial<Omit<CreatePersonaParams, 'userId'>>
  ): Promise<UserPersona> {
    // 권한 검증: 본인 페르소나만 수정 가능
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error('Persona not found or forbidden');
    }

    // 기본 페르소나로 변경하는 경우, 다른 기본 페르소나 해제
    if (data.isDefault) {
      await this.prisma.userPersona.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return await this.prisma.userPersona.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.persona !== undefined && { persona: data.persona }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
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
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      // 새 기본 페르소나 설정
      return await tx.userPersona.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }
}
