import { PrismaClient, LlmModel } from '@prisma/client';
import {
  ILlmModelRepository,
  FindLlmModelsParams,
  CreateLlmModelParams,
} from '../../domain/repositories/ILlmModelRepository.js';

/**
 * Prisma 기반 LlmModel Repository 구현
 */
export class PrismaLlmModelRepository implements ILlmModelRepository {
  constructor(private prisma: PrismaClient) {}

  async findBySlug(slug: string): Promise<LlmModel | null> {
    return await this.prisma.llmModel.findUnique({
      where: { slug },
    });
  }

  async findById(id: string): Promise<LlmModel | null> {
    return await this.prisma.llmModel.findUnique({
      where: { id },
    });
  }

  async findMany(params: FindLlmModelsParams): Promise<{
    models: LlmModel[];
    total: number;
  }> {
    const { isActive, provider, limit = 20, offset = 0 } = params;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (provider) {
      where.provider = provider;
    }

    const [models, total] = await Promise.all([
      this.prisma.llmModel.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { gemCostPerMessage: 'asc' }, // 저렴한 순
      }),
      this.prisma.llmModel.count({ where }),
    ]);

    return { models, total };
  }

  async findDefaultModel(): Promise<LlmModel | null> {
    return await this.prisma.llmModel.findFirst({
      where: { isActive: true },
      orderBy: { gemCostPerMessage: 'asc' }, // 가장 저렴한 모델
    });
  }

  async create(params: CreateLlmModelParams): Promise<LlmModel> {
    return await this.prisma.llmModel.create({
      data: {
        slug: params.slug,
        name: params.name,
        provider: params.provider,
        modelId: params.modelId,
        description: params.description,
        gemCostPerMessage: params.gemCostPerMessage,
        isActive: params.isActive,
      },
    });
  }

  async update(id: string, data: Partial<CreateLlmModelParams>): Promise<LlmModel> {
    return await this.prisma.llmModel.update({
      where: { id },
      data: {
        ...(data.slug && { slug: data.slug }),
        ...(data.name && { name: data.name }),
        ...(data.provider && { provider: data.provider }),
        ...(data.modelId !== undefined && { modelId: data.modelId }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.gemCostPerMessage !== undefined && {
          gemCostPerMessage: data.gemCostPerMessage,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.llmModel.delete({
      where: { id },
    });
  }
}
