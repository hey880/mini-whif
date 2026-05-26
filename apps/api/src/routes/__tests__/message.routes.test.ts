import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

describe('Message Routes - Performance Optimizations', () => {
  let testUserId: string;
  let testCharacterId: string;
  let testRoomId: string;
  let testMessageId: string;

  beforeEach(async () => {
    // Create test user with gem wallet
    testUserId = randomUUID();
    await prisma.profile.create({
      data: {
        id: testUserId,
        email: `test-${randomUUID()}@example.com`,
        displayName: 'Test User',
        gemWallet: {
          create: {
            freeDailyGemAmount: 200,
            freePromoGemAmount: 0,
            paidGemAmount: 0,
          },
        },
      },
    });

    // Create test character
    const character = await prisma.character.create({
      data: {
        name: 'Test Character',
        creatorId: testUserId,
        visibility: 'public',
        data: {},
      },
    });
    testCharacterId = character.id;

    // Create test chat room
    const room = await prisma.chatRoom.create({
      data: {
        userId: testUserId,
        characterId: testCharacterId,
        title: 'Test Room',
      },
    });
    testRoomId = room.id;

    // Create test message
    const message = await prisma.message.create({
      data: {
        roomId: testRoomId,
        role: 'assistant',
        content: 'Test response',
        modelSlug: 'test-model',
        metadata: {},
      },
    });
    testMessageId = message.id;

    // Create active LLM model
    await prisma.llmModel.deleteMany({}); // Clean existing
    await prisma.llmModel.create({
      data: {
        slug: 'test-model',
        name: 'Test Model',
        provider: 'test',
        contextWindow: 4096,
        maxOutputTokens: 2048,
        isActive: true,
        gemCostPerMessage: 5,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.userReaction.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.message.deleteMany({
      where: { roomId: testRoomId },
    });
    await prisma.chatRoom.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.gemWallet.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.character.deleteMany({
      where: { id: testCharacterId },
    });
    await prisma.profile.deleteMany({
      where: { id: testUserId },
    });
    await prisma.llmModel.deleteMany({
      where: { slug: 'test-model' },
    });
  });

  describe('regenerate - Parallel Query Optimization', () => {
    it('should fetch profile and default model in parallel', async () => {
      const startTime = Date.now();

      // Simulate the optimized parallel query pattern
      const [profile, defaultModel] = await Promise.all([
        prisma.profile.findUnique({
          where: { id: testUserId },
          include: { chosenLlmModel: true, gemWallet: true },
        }),
        prisma.llmModel.findFirst({
          where: { isActive: true },
          orderBy: { gemCostPerMessage: 'asc' },
        }),
      ]);

      const duration = Date.now() - startTime;

      expect(profile).toBeDefined();
      expect(defaultModel).toBeDefined();
      expect(profile!.gemWallet).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete in less than 2s (relaxed for CI/CD)
    });

    it('should calculate gem balance from wallet without additional query', async () => {
      const profile = await prisma.profile.findUnique({
        where: { id: testUserId },
        include: { gemWallet: true },
      });

      expect(profile).toBeDefined();
      expect(profile!.gemWallet).toBeDefined();

      // Calculate balance directly from wallet (no additional query needed)
      const totalGems =
        profile!.gemWallet!.freeDailyGemAmount +
        profile!.gemWallet!.freePromoGemAmount +
        profile!.gemWallet!.paidGemAmount;

      expect(totalGems).toBe(200);
    });
  });

  describe('reaction - Transaction Atomicity', () => {
    it('should update reaction and message count atomically', async () => {
      // Create a reaction with transaction
      await prisma.$transaction([
        prisma.userReaction.create({
          data: {
            userId: testUserId,
            messageId: testMessageId,
            reactionType: 'positive',
          },
        }),
        prisma.message.update({
          where: { id: testMessageId },
          data: { positiveReactionCount: { increment: 1 } },
        }),
      ]);

      // Verify both operations succeeded
      const reaction = await prisma.userReaction.findUnique({
        where: {
          userId_messageId: {
            userId: testUserId,
            messageId: testMessageId,
          },
        },
      });

      const message = await prisma.message.findUnique({
        where: { id: testMessageId },
      });

      expect(reaction).toBeDefined();
      expect(reaction!.reactionType).toBe('positive');
      expect(message!.positiveReactionCount).toBe(1);
    });

    it('should rollback both operations if one fails', async () => {
      try {
        await prisma.$transaction([
          prisma.userReaction.create({
            data: {
              userId: testUserId,
              messageId: testMessageId,
              reactionType: 'positive',
            },
          }),
          // This will fail due to invalid message ID
          prisma.message.update({
            where: { id: 'invalid-id' },
            data: { positiveReactionCount: { increment: 1 } },
          }),
        ]);
      } catch (error) {
        // Expected to fail
      }

      // Verify reaction was not created (rolled back)
      const reaction = await prisma.userReaction.findUnique({
        where: {
          userId_messageId: {
            userId: testUserId,
            messageId: testMessageId,
          },
        },
      });

      expect(reaction).toBeNull();
    });

    it('should handle reaction toggle (delete) atomically', async () => {
      // First create a reaction
      const existingReaction = await prisma.userReaction.create({
        data: {
          userId: testUserId,
          messageId: testMessageId,
          reactionType: 'positive',
        },
      });

      await prisma.message.update({
        where: { id: testMessageId },
        data: { positiveReactionCount: 1 },
      });

      // Toggle off (delete) with transaction
      await prisma.$transaction([
        prisma.userReaction.delete({
          where: { id: existingReaction.id },
        }),
        prisma.message.update({
          where: { id: testMessageId },
          data: { positiveReactionCount: { decrement: 1 } },
        }),
      ]);

      // Verify both operations succeeded
      const reaction = await prisma.userReaction.findUnique({
        where: { id: existingReaction.id },
      });

      const message = await prisma.message.findUnique({
        where: { id: testMessageId },
      });

      expect(reaction).toBeNull();
      expect(message!.positiveReactionCount).toBe(0);
    });
  });
});
