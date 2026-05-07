import type { ServiceImpl, HandlerContext } from '@connectrpc/connect';
import { Code, ConnectError } from '@connectrpc/connect';
import { LlmModelService } from '@persona-chat/proto/gen/ts/llmmodel_connect.js';
import { prisma } from '../config/prisma.js';
import { userContextKey } from '../context.js';

export const llmModelHandler: ServiceImpl<typeof LlmModelService> = {
  async listModels(req) {
    const where = req.isActive !== undefined ? { isActive: req.isActive } : {};

    const models = await prisma.llmModel.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return {
      models: models.map((model) => ({
        id: model.id,
        name: model.name,
        slug: model.slug,
        provider: model.provider,
        contextWindow: model.contextWindow,
        maxOutputTokens: model.maxOutputTokens,
        gemCostPerMessage: model.gemCostPerMessage,
        isActive: model.isActive,
        createdAt: model.createdAt.toISOString(),
        updatedAt: model.updatedAt.toISOString(),
      })),
    };
  },

  async getCurrentModel(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Get user's chosen model
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      include: { chosenLlmModel: true },
    });

    let model = profile?.chosenLlmModel;

    // If no chosen model, default to the cheapest active model
    if (!model) {
      model = await prisma.llmModel.findFirst({
        where: { isActive: true },
        orderBy: { gemCostPerMessage: 'asc' },
      });
    }

    if (!model) {
      throw new ConnectError('No active models available', Code.NotFound);
    }

    return {
      model: {
        id: model.id,
        name: model.name,
        slug: model.slug,
        provider: model.provider,
        contextWindow: model.contextWindow,
        maxOutputTokens: model.maxOutputTokens,
        gemCostPerMessage: model.gemCostPerMessage,
        isActive: model.isActive,
        createdAt: model.createdAt.toISOString(),
        updatedAt: model.updatedAt.toISOString(),
      },
    };
  },

  async updateCurrentModel(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Verify model exists and is active
    const model = await prisma.llmModel.findUnique({
      where: { id: req.modelId },
    });

    if (!model) {
      throw new ConnectError('Model not found', Code.NotFound);
    }

    if (!model.isActive) {
      throw new ConnectError('Model is not active', Code.FailedPrecondition);
    }

    // Update user's chosen model
    await prisma.profile.update({
      where: { id: user.id },
      data: { chosenLlmModelId: req.modelId },
    });

    return {
      model: {
        id: model.id,
        name: model.name,
        slug: model.slug,
        provider: model.provider,
        contextWindow: model.contextWindow,
        maxOutputTokens: model.maxOutputTokens,
        gemCostPerMessage: model.gemCostPerMessage,
        isActive: model.isActive,
        createdAt: model.createdAt.toISOString(),
        updatedAt: model.updatedAt.toISOString(),
      },
    };
  },
};
