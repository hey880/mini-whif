import { PrismaClient } from '@prisma/client';
import { SendMessageDto } from '../dto/SendMessageDto.js';
import { IChatRoomRepository } from '../../domain/repositories/IChatRoomRepository.js';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository.js';
import { IGemWalletRepository } from '../../domain/repositories/IGemWalletRepository.js';
import { ILlmModelRepository } from '../../domain/repositories/ILlmModelRepository.js';
import { IVectorSearchRepository } from '../../domain/repositories/IVectorSearchRepository.js';
import { AIStreamingService } from '../../services/ai-streaming.service.js';
import { EmbeddingService } from './EmbeddingService.js';
import type { FastifyInstance } from 'fastify';

/**
 * AI 컨텍스트
 */
interface AIContext {
  characterName: string;
  characterContext: {
    name: string;
    description: string;
    greeting: string;
    personality: string;
  };
  personaName: string;
  lorebookEntries: any[];
  situationalImagesInfo: any[];
  relevantMemories?: Array<{
    summary: string;
    similarity: number;
    importance: number;
  }>;
}

/**
 * Chat Service
 *
 * 채팅 관련 비즈니스 로직을 담당합니다.
 * - 메시지 전송
 * - AI 컨텍스트 구성
 * - SSE 스트리밍 조율
 */
export class ChatService {
  constructor(
    private prisma: PrismaClient,
    private chatRoomRepo: IChatRoomRepository,
    private messageRepo: IMessageRepository,
    private gemWalletRepo: IGemWalletRepository,
    private llmModelRepo: ILlmModelRepository,
    private vectorSearchRepo: IVectorSearchRepository,
    private embeddingService: EmbeddingService,
    private aiStreamingService: AIStreamingService,
    private server: FastifyInstance
  ) {}

  /**
   * 메시지 전송 및 AI 응답 스트리밍
   *
   * 전체 플로우:
   * 1. 채팅방 조회 및 권한 검증
   * 2. 모델 선택 (chosen or default)
   * 3. Gem 잔액 확인
   * 4. 메시지 저장 (user + AI placeholder)
   * 5. AI 컨텍스트 구성
   * 6. SSE 스트리밍
   */
  async sendMessage(dto: SendMessageDto): Promise<void> {
    const { userId, roomId, content, hint, reply } = dto;

    // 1. Parallel fetch: room + profile
    const [room, profile] = await Promise.all([
      this.prisma.chatRoom.findUnique({
        where: { id: roomId },
        include: {
          character: {
            select: {
              id: true,
              name: true,
              description: true,
              aiPromptDescription: true,
              greeting: true,
              tagline: true,
              lorebook: true,
              data: true,
              isNsfw: true,
              defaultLlmModelId: true,
              defaultLlmModel: true,
              universeId: true,
              universe: {
                select: {
                  id: true,
                  name: true,
                  lorebook: true,
                  data: true, // Universe의 상황별 이미지를 위해 필요
                },
              },
            },
          },
        },
      }),
      this.prisma.profile.findUnique({
        where: { id: userId },
        include: {
          chosenLlmModel: true,
          gemWallet: true,
        },
      }),
    ]);

    // Verify room ownership
    if (!room || room.userId !== userId) {
      throw new Error('Chat room not found or forbidden');
    }

    // 2. Get model (priority: character default > user chosen > system default)
    let model = null;

    // 1순위: 캐릭터 지정 모델
    if (room.character.defaultLlmModelId && room.character.defaultLlmModel) {
      model = room.character.defaultLlmModel;
    }
    // 2순위: 사용자 선택 모델
    else if (profile?.chosenLlmModel) {
      model = profile.chosenLlmModel;
    }
    // 3순위: NSFW 캐릭터면 NSFW 기본 모델, 아니면 일반 기본 모델
    else {
      if (room.character.isNsfw) {
        model = await this.llmModelRepo.findDefaultNsfwModel();
        // NSFW 모델이 없으면 일반 기본 모델로 fallback
        if (!model) {
          model = await this.llmModelRepo.findDefaultModel();
        }
      } else {
        model = await this.llmModelRepo.findDefaultModel();
      }
    }

    if (!model) {
      throw new Error('No active models available');
    }

    const gemCost = model.gemCostPerMessage;

    // 3. Check gem balance
    const hasSufficient = await this.gemWalletRepo.hasSufficientBalance(userId, gemCost);
    if (!hasSufficient) {
      const balance = await this.gemWalletRepo.getBalance(userId);
      throw new Error(
        `Insufficient gems. Required: ${gemCost}, Available: ${balance.totalGems}`
      );
    }

    // 4. Fetch persona
    const persona = room.personaId
      ? await this.prisma.userPersona.findUnique({
          where: { id: room.personaId },
          select: { name: true },
        })
      : null;

    // 5. Save messages
    const userMessage =
      !hint || content
        ? await this.prisma.message.create({
            data: {
              roomId,
              role: 'user',
              content: content || '',
            },
          })
        : null;

    const aiMessage = await this.prisma.message.create({
      data: {
        roomId,
        role: 'assistant',
        content: '',
        modelSlug: model.slug,
      },
    });

    // 6. Build AI context
    const aiContext = this.buildAIContext(room, persona);

    // 6.5. RAG: Search for relevant memories (Graceful degradation)
    if (content) {
      try {
        const relevantMemories = await this.searchRelevantMemories(roomId, content);
        aiContext.relevantMemories = relevantMemories;
      } catch (error) {
        console.error('[ChatService] Failed to search relevant memories:', error);
        // Continue without RAG
      }
    }

    // 6.6. Fetch recent message history (last 50 messages)
    const messageHistory = await this.messageRepo.findRecent(roomId, 50);

    // 7. Stream AI response
    await this.aiStreamingService.streamAIResponse({
      userId,
      roomId,
      messageId: aiMessage.id,
      userMessage: content || '',
      hint,
      modelSlug: model.slug,
      maxTokens: 1000, // Default max tokens
      characterContext: aiContext.characterContext,
      lorebookEntries: aiContext.lorebookEntries,
      situationalImagesInfo: aiContext.situationalImagesInfo,
      characterData: room.character.data,
      personaName: aiContext.personaName,
      userNote: room.userNote,
      conversationSummary: room.conversationSummary,
      relevantMemories: aiContext.relevantMemories,
      messageHistory: messageHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      reply,
      server: this.server,
    });

    // 8. 비동기로 사용자 메시지 임베딩 생성 (fire and forget)
    if (userMessage) {
      this.embeddingService
        .embedMessageAsync(userMessage.id, content || '')
        .catch((err) => {
          console.error('[ChatService] Failed to embed user message:', err);
        });
    }
  }

  /**
   * RAG: 관련 기억 검색
   *
   * 사용자 메시지와 유사한 과거 대화 기억을 검색합니다.
   * 중요도와 유사도를 결합하여 상위 3개 반환
   */
  private async searchRelevantMemories(
    roomId: string,
    userMessage: string
  ): Promise<Array<{ summary: string; similarity: number; importance: number }>> {
    try {
      // 사용자 메시지 임베딩 생성
      const queryEmbedding = await this.embeddingService.generateEmbedding(userMessage);

      // 유사한 대화 기억 검색
      const memories = await this.vectorSearchRepo.searchConversationMemories({
        roomId,
        queryEmbedding,
        limit: 3,
        importanceWeight: 0.3, // 중요도 30%, 유사도 70%
      });

      return memories.map((mem) => ({
        summary: mem.summary,
        similarity: mem.similarity,
        importance: mem.importance,
      }));
    } catch (error) {
      console.error('[ChatService] Failed to search relevant memories:', error);
      return [];
    }
  }

  /**
   * AI 컨텍스트 구성
   *
   * - 캐릭터 정보
   * - Lorebook 파싱 (Universe + Character)
   * - Placeholder 치환
   * - Situational Images 추출
   */
  private buildAIContext(room: any, persona: any): AIContext {
    const personaName = persona?.name || '사용자';
    const characterName = room.character.name;

    // Placeholder replacements
    const replacePlaceholders = (text: string): string => {
      return text
        .replace(/\{\{userName\}\}/g, personaName)
        .replace(/\{\{characterName\}\}/g, characterName);
    };

    // Build character context
    const characterContext = {
      name: characterName,
      description: replacePlaceholders(room.character.description || ''),
      greeting: replacePlaceholders(room.character.greeting || ''),
      personality: replacePlaceholders(
        room.character.aiPromptDescription || room.character.tagline || ''
      ),
    };

    // Parse and merge lorebooks
    const lorebookEntries: any[] = [];

    // Universe lorebook
    if (room.character.universe?.lorebook) {
      try {
        const universeLorebook =
          typeof room.character.universe.lorebook === 'string'
            ? JSON.parse(room.character.universe.lorebook)
            : room.character.universe.lorebook;

        const universeEntries = (universeLorebook.entries || []).map((entry: any) => ({
          ...entry,
          source: 'universe',
          universeName: room.character.universe?.name,
        }));

        lorebookEntries.push(...universeEntries);
      } catch (e) {
        console.warn('Failed to parse universe lorebook:', e);
      }
    }

    // Character lorebook
    if (room.character.lorebook) {
      try {
        const characterLorebook =
          typeof room.character.lorebook === 'string'
            ? JSON.parse(room.character.lorebook)
            : room.character.lorebook;

        const characterEntries = (characterLorebook.entries || []).map((entry: any) => ({
          ...entry,
          source: 'character',
          characterName: room.character.name,
        }));

        lorebookEntries.push(...characterEntries);
      } catch (e) {
        console.warn('Failed to parse character lorebook:', e);
      }
    }

    // Sort by priority
    lorebookEntries.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Extract and merge situational images (Universe + Character)
    let situationalImagesInfo: any[] = [];

    // 1. Add Universe situational images (if exists)
    try {
      const universeData = room.character.universe?.data as any;
      if (universeData?.situationalImages && Array.isArray(universeData.situationalImages)) {
        const universeImages = universeData.situationalImages.map((img: any) => ({
          ...img,
          source: 'universe',
          universeName: room.character.universe?.name,
        }));
        situationalImagesInfo.push(...universeImages);
      }
    } catch (e) {
      console.warn('Failed to parse universe situational images:', e);
    }

    // 2. Add Character situational images (if exists)
    try {
      const characterData = room.character.data as any;
      if (characterData?.situationalImages && Array.isArray(characterData.situationalImages)) {
        const characterImages = characterData.situationalImages.map((img: any) => ({
          ...img,
          source: 'character',
          characterName: room.character.name,
        }));
        situationalImagesInfo.push(...characterImages);
      }
    } catch (e) {
      console.warn('Failed to parse character situational images:', e);
    }

    return {
      characterName,
      characterContext,
      personaName,
      lorebookEntries,
      situationalImagesInfo,
    };
  }
}
