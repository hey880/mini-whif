import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatService } from '../ChatService.js';
import type { PrismaClient } from '@prisma/client';
import type { IChatRoomRepository } from '../../../domain/repositories/IChatRoomRepository.js';
import type { IMessageRepository } from '../../../domain/repositories/IMessageRepository.js';
import type { IGemWalletRepository } from '../../../domain/repositories/IGemWalletRepository.js';
import type { ILlmModelRepository } from '../../../domain/repositories/ILlmModelRepository.js';
import type { AIStreamingService } from '../../../services/ai-streaming.service.js';

describe('ChatService', () => {
  let chatService: ChatService;
  let mockPrisma: any;
  let mockChatRoomRepo: any;
  let mockMessageRepo: any;
  let mockGemWalletRepo: any;
  let mockLlmModelRepo: any;
  let mockAIStreamingService: any;

  beforeEach(() => {
    // Mock Prisma
    mockPrisma = {
      chatRoom: {
        findUnique: vi.fn(),
      },
      profile: {
        findUnique: vi.fn(),
      },
      userPersona: {
        findUnique: vi.fn(),
      },
      message: {
        create: vi.fn(),
      },
    };

    // Mock Repositories
    mockChatRoomRepo = {};
    mockMessageRepo = {};
    mockGemWalletRepo = {
      hasSufficientBalance: vi.fn(),
      getBalance: vi.fn(),
    };
    mockLlmModelRepo = {
      findDefaultModel: vi.fn(),
    };

    // Mock AI Streaming Service
    mockAIStreamingService = {
      streamResponse: vi.fn(),
    };

    chatService = new ChatService(
      mockPrisma as PrismaClient,
      mockChatRoomRepo as IChatRoomRepository,
      mockMessageRepo as IMessageRepository,
      mockGemWalletRepo as IGemWalletRepository,
      mockLlmModelRepo as ILlmModelRepository,
      mockAIStreamingService as AIStreamingService
    );
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      // Given
      const mockRoom = {
        id: 'room-1',
        userId: 'user-1',
        personaId: null,
        character: {
          id: 'char-1',
          name: 'Test Character',
          description: 'Test description',
          greeting: 'Hello!',
          tagline: 'Friendly',
          lorebook: null,
          data: {},
          universeId: null,
          universe: null,
        },
      };

      const mockProfile = {
        id: 'user-1',
        chosenLlmModel: {
          slug: 'test-model',
          gemCostPerMessage: 5,
        },
        gemWallet: {
          paidGemAmount: 100,
          freeDailyGemAmount: 200,
          freePromoGemAmount: 0,
        },
      };

      const mockMessage = {
        id: 'msg-1',
        roomId: 'room-1',
        role: 'assistant',
        content: '',
      };

      mockPrisma.chatRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.message.create.mockResolvedValue(mockMessage);
      mockGemWalletRepo.hasSufficientBalance.mockResolvedValue(true);
      mockAIStreamingService.streamResponse.mockResolvedValue(undefined);

      const dto = {
        userId: 'user-1',
        roomId: 'room-1',
        content: 'Hello',
        hint: undefined,
        reply: {} as any,
      };

      // When
      await chatService.sendMessage(dto);

      // Then
      expect(mockPrisma.chatRoom.findUnique).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        include: expect.any(Object),
      });
      expect(mockGemWalletRepo.hasSufficientBalance).toHaveBeenCalledWith('user-1', 5);
      expect(mockAIStreamingService.streamResponse).toHaveBeenCalled();
    });

    it('should throw error if room not found', async () => {
      // Given
      mockPrisma.chatRoom.findUnique.mockResolvedValue(null);
      mockPrisma.profile.findUnique.mockResolvedValue({});

      const dto = {
        userId: 'user-1',
        roomId: 'room-1',
        content: 'Hello',
        hint: undefined,
        reply: {} as any,
      };

      // When & Then
      await expect(chatService.sendMessage(dto)).rejects.toThrow(
        'Chat room not found or forbidden'
      );
    });

    it('should throw error if insufficient gems', async () => {
      // Given
      const mockRoom = {
        id: 'room-1',
        userId: 'user-1',
        personaId: null,
        character: {
          id: 'char-1',
          name: 'Test Character',
          description: '',
          greeting: '',
          tagline: '',
          lorebook: null,
          data: {},
          universeId: null,
          universe: null,
        },
      };

      const mockProfile = {
        id: 'user-1',
        chosenLlmModel: {
          slug: 'test-model',
          gemCostPerMessage: 5,
        },
        gemWallet: {},
      };

      mockPrisma.chatRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);
      mockGemWalletRepo.hasSufficientBalance.mockResolvedValue(false);
      mockGemWalletRepo.getBalance.mockResolvedValue({ totalGems: 2 });

      const dto = {
        userId: 'user-1',
        roomId: 'room-1',
        content: 'Hello',
        hint: undefined,
        reply: {} as any,
      };

      // When & Then
      await expect(chatService.sendMessage(dto)).rejects.toThrow('Insufficient gems');
    });

    it('should use default model if no chosen model', async () => {
      // Given
      const mockRoom = {
        id: 'room-1',
        userId: 'user-1',
        personaId: null,
        character: {
          id: 'char-1',
          name: 'Test Character',
          description: '',
          greeting: '',
          tagline: '',
          lorebook: null,
          data: {},
          universeId: null,
          universe: null,
        },
      };

      const mockProfile = {
        id: 'user-1',
        chosenLlmModel: null,
        gemWallet: {},
      };

      const mockDefaultModel = {
        slug: 'default-model',
        gemCostPerMessage: 3,
      };

      mockPrisma.chatRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);
      mockLlmModelRepo.findDefaultModel.mockResolvedValue(mockDefaultModel);
      mockGemWalletRepo.hasSufficientBalance.mockResolvedValue(true);
      mockPrisma.message.create.mockResolvedValue({ id: 'msg-1' });
      mockAIStreamingService.streamResponse.mockResolvedValue(undefined);

      const dto = {
        userId: 'user-1',
        roomId: 'room-1',
        content: 'Hello',
        hint: undefined,
        reply: {} as any,
      };

      // When
      await chatService.sendMessage(dto);

      // Then
      expect(mockLlmModelRepo.findDefaultModel).toHaveBeenCalled();
      expect(mockGemWalletRepo.hasSufficientBalance).toHaveBeenCalledWith('user-1', 3);
    });
  });
});
