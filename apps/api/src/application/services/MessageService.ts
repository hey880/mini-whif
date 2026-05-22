import { PrismaClient } from '@prisma/client';
import { RegenerateMessageDto, UpdateReactionDto } from '../dto/RegenerateMessageDto.js';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository.js';
import { IGemWalletRepository } from '../../domain/repositories/IGemWalletRepository.js';
import { ILlmModelRepository } from '../../domain/repositories/ILlmModelRepository.js';
import { AIStreamingService } from '../../services/ai-streaming.service.js';
import type { FastifyInstance } from 'fastify';

/**
 * Reaction 업데이트 결과
 */
export interface UpdateReactionResult {
  success: boolean;
  removed?: boolean;
  changed?: boolean;
  created?: boolean;
  isPositive?: boolean;
}

/**
 * Message Service
 *
 * 메시지 관련 비즈니스 로직을 담당합니다.
 * - 메시지 재생성
 * - Reaction 업데이트
 * - 메시지 삭제
 */
export class MessageService {
  constructor(
    private prisma: PrismaClient,
    private messageRepo: IMessageRepository,
    private gemWalletRepo: IGemWalletRepository,
    private llmModelRepo: ILlmModelRepository,
    private aiStreamingService: AIStreamingService,
    private server: FastifyInstance
  ) {}

  /**
   * 메시지 재생성
   *
   * 플로우:
   * 1. 메시지 조회 + 권한 검증
   * 2. 모델 선택 + Gem 확인
   * 3. 현재 버전 저장
   * 4. AI 재생성 스트리밍
   */
  async regenerateMessage(dto: RegenerateMessageDto): Promise<void> {
    const { userId, messageId, reply } = dto;

    // 1. Get message with room
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        room: {
          include: {
            character: {
              select: {
                id: true,
                name: true,
                description: true,
                greeting: true,
                tagline: true,
                lorebook: true,
                data: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.room.userId !== userId) {
      throw new Error('Forbidden');
    }

    // Handle user message regeneration separately
    if (message.role !== 'assistant') {
      if (message.role === 'user') {
        return await this.regenerateUserMessage(dto);
      }
      throw new Error('Can only regenerate assistant or user messages');
    }

    // 2. Get user's chosen model and check gem balance (Phase 1 optimization: parallel)
    const [profile, defaultModel] = await Promise.all([
      this.prisma.profile.findUnique({
        where: { id: userId },
        include: { chosenLlmModel: true, gemWallet: true },
      }),
      this.llmModelRepo.findDefaultModel(),
    ]);

    const model = profile?.chosenLlmModel || defaultModel;

    if (!model) {
      throw new Error('No active models available');
    }

    // Apply regenerate cost multiplier
    const REGENERATE_GEM_COST_MULTIPLIER = parseFloat(
      process.env.REGENERATE_GEM_COST_MULTIPLIER || '1.0'
    );
    const gemCost = Math.round(model.gemCostPerMessage * REGENERATE_GEM_COST_MULTIPLIER);

    // Check gem balance (Phase 1 optimization: use wallet from profile query)
    const wallet = profile?.gemWallet;
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const totalGems =
      wallet.freeDailyGemAmount + wallet.freePromoGemAmount + wallet.paidGemAmount;
    if (totalGems < gemCost) {
      throw new Error(
        `Insufficient gems. Required: ${gemCost}, Available: ${totalGems}`
      );
    }

    // 3. Save current content to MessageVersion
    await this.messageRepo.saveAsVersion(messageId);

    // 4. Find the previous user message
    const previousUserMessage = await this.prisma.message.findFirst({
      where: {
        roomId: message.roomId,
        role: 'user',
        createdAt: { lt: message.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    const userMessageContent = previousUserMessage?.content || '';

    // TODO: Improve AI context building (use ChatService.buildAIContext pattern)
    // 5. Stream AI response (regenerate)
    await this.aiStreamingService.streamAIResponse({
      userId,
      roomId: message.roomId,
      messageId: message.id,
      userMessage: userMessageContent,
      hint: undefined,
      modelSlug: model.slug,
      maxTokens: 1000,
      characterContext: {
        name: message.room.character.name,
        description: message.room.character.description || '',
        greeting: message.room.character.greeting || '',
        personality: message.room.character.tagline || '',
      },
      lorebookEntries: [], // TODO: Parse lorebook properly
      situationalImagesInfo: [], // TODO: Extract from character.data
      characterData: message.room.character.data,
      personaName: '사용자', // TODO: fetch from persona
      reply,
      server: this.server,
    });
  }

  /**
   * 사용자 메시지 재생성
   *
   * 플로우:
   * 1. user 메시지 조회 + 권한 검증
   * 2. 모델 선택 + Gem 확인
   * 3. 새 AI 메시지 플레이스홀더 생성
   * 4. AI 응답 스트리밍
   * 5. Gem 차감
   */
  private async regenerateUserMessage(dto: RegenerateMessageDto): Promise<void> {
    const { userId, messageId, hint, reply } = dto;

    // 1. Get user message (재사용)
    const userMessage = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        room: {
          include: {
            character: {
              select: {
                id: true,
                name: true,
                description: true,
                greeting: true,
                tagline: true,
                lorebook: true,
                data: true,
              },
            },
            persona: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!userMessage) {
      throw new Error('Message not found');
    }

    if (userMessage.room.userId !== userId) {
      throw new Error('Forbidden');
    }

    // 2. Get model and check gems (parallel)
    const [profile, defaultModel] = await Promise.all([
      this.prisma.profile.findUnique({
        where: { id: userId },
        include: { chosenLlmModel: true, gemWallet: true },
      }),
      this.llmModelRepo.findDefaultModel(),
    ]);

    const model = profile?.chosenLlmModel || defaultModel;
    if (!model) {
      throw new Error('No active models available');
    }

    const gemCost = Math.round(
      model.gemCostPerMessage * parseFloat(process.env.REGENERATE_GEM_COST_MULTIPLIER || '1.0')
    );

    const wallet = profile?.gemWallet;
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const totalGems = wallet.freeDailyGemAmount + wallet.freePromoGemAmount + wallet.paidGemAmount;
    if (totalGems < gemCost) {
      throw new Error(`Insufficient gems. Required: ${gemCost}, Available: ${totalGems}`);
    }

    // 3. Create new AI message placeholder
    const aiMessage = await this.prisma.message.create({
      data: {
        roomId: userMessage.roomId,
        role: 'assistant',
        content: '',
        modelSlug: model.slug,
      },
    });

    // 4. Stream AI response (기존 user 메시지 재사용)
    await this.aiStreamingService.streamAIResponse({
      userId,
      roomId: userMessage.roomId,
      messageId: aiMessage.id,
      userMessage: userMessage.content, // ✅ 기존 user 메시지
      hint,
      modelSlug: model.slug,
      maxTokens: model.maxOutputTokens,
      characterContext: {
        name: userMessage.room.character.name,
        description: userMessage.room.character.description || '',
        greeting: userMessage.room.character.greeting || '',
        personality: userMessage.room.character.tagline || '',
      },
      lorebookEntries: [],
      situationalImagesInfo: [],
      characterData: userMessage.room.character.data,
      personaName: userMessage.room.persona?.name || '사용자',
      userNote: userMessage.room.userNote,
      conversationSummary: userMessage.room.conversationSummary,
      reply,
      server: this.server,
    });
  }

  /**
   * Reaction 업데이트
   *
   * Phase 1 개선: 트랜잭션으로 원자성 보장
   */
  async updateReaction(dto: UpdateReactionDto): Promise<UpdateReactionResult> {
    const { userId, messageId, isPositive } = dto;

    // Convert boolean to reactionType string
    const reactionType = isPositive ? 'positive' : 'negative';

    // Get message and verify ownership
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { room: true },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.room.userId !== userId) {
      throw new Error('Forbidden');
    }

    // Upsert reaction
    const existingReaction = await this.prisma.userReaction.findUnique({
      where: {
        userId_messageId: {
          userId,
          messageId,
        },
      },
    });

    if (existingReaction) {
      // If same reaction, delete it (toggle off)
      if (existingReaction.reactionType === reactionType) {
        await this.prisma.$transaction([
          this.prisma.userReaction.delete({
            where: { id: existingReaction.id },
          }),
          this.prisma.message.update({
            where: { id: messageId },
            data: isPositive
              ? { positiveReactionCount: { decrement: 1 } }
              : { negativeReactionCount: { decrement: 1 } },
          }),
        ]);

        return { success: true, removed: true };
      } else {
        // Change reaction
        await this.prisma.$transaction([
          this.prisma.userReaction.update({
            where: { id: existingReaction.id },
            data: { reactionType },
          }),
          this.prisma.message.update({
            where: { id: messageId },
            data: {
              positiveReactionCount: isPositive ? { increment: 1 } : { decrement: 1 },
              negativeReactionCount: isPositive ? { decrement: 1 } : { increment: 1 },
            },
          }),
        ]);

        return { success: true, changed: true, isPositive };
      }
    } else {
      // Create new reaction
      await this.prisma.$transaction([
        this.prisma.userReaction.create({
          data: {
            userId,
            messageId,
            reactionType,
          },
        }),
        this.prisma.message.update({
          where: { id: messageId },
          data: isPositive
            ? { positiveReactionCount: { increment: 1 } }
            : { negativeReactionCount: { increment: 1 } },
        }),
      ]);

      return { success: true, created: true, isPositive };
    }
  }

  /**
   * 메시지 삭제
   */
  async deleteMessage(userId: string, messageId: string): Promise<void> {
    // Get message and verify ownership
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { room: true },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.room.userId !== userId) {
      throw new Error('Forbidden');
    }

    await this.messageRepo.delete(messageId);
  }
}
