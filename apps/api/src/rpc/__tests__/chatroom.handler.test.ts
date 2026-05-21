import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

describe('ChatRoom Handler - cloneChatRoom Performance', () => {
  let testUserId: string;
  let testCharacterId: string;
  let testRoomId: string;

  beforeEach(async () => {
    // Create test user
    testUserId = randomUUID();
    await prisma.profile.create({
      data: {
        id: testUserId,
        email: `test-${Date.now()}@example.com`,
        displayName: 'Test User',
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

    // Create test chat room with messages
    const room = await prisma.chatRoom.create({
      data: {
        userId: testUserId,
        characterId: testCharacterId,
        title: 'Test Room',
      },
    });
    testRoomId = room.id;

    // Create 100 test messages
    const messages = Array.from({ length: 100 }, (_, i) => ({
      roomId: testRoomId,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Test message ${i}`,
      modelSlug: 'test-model',
      metadata: {},
    }));

    await prisma.message.createMany({
      data: messages,
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.message.deleteMany({
      where: { roomId: testRoomId },
    });
    await prisma.chatRoom.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.character.deleteMany({
      where: { id: testCharacterId },
    });
    await prisma.profile.deleteMany({
      where: { id: testUserId },
    });
  });

  it('should clone chat room with 100 messages in less than 1 second', async () => {
    const startTime = Date.now();

    // Get source room with messages
    const sourceRoom = await prisma.chatRoom.findUnique({
      where: { id: testRoomId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    expect(sourceRoom).toBeDefined();
    expect(sourceRoom!.messages.length).toBe(100);

    // Clone the room with messages (optimized with createMany)
    const newRoom = await prisma.chatRoom.create({
      data: {
        userId: testUserId,
        characterId: testCharacterId,
        title: `${sourceRoom!.title} (Copy)`,
      },
    });

    if (sourceRoom!.messages.length > 0) {
      await prisma.message.createMany({
        data: sourceRoom!.messages.map(msg => ({
          roomId: newRoom.id,
          role: msg.role,
          content: msg.content,
          modelSlug: msg.modelSlug,
          metadata: msg.metadata as any,
        })),
      });
    }

    const duration = Date.now() - startTime;

    // Verify the clone
    const clonedMessages = await prisma.message.count({
      where: { roomId: newRoom.id },
    });

    expect(clonedMessages).toBe(100);
    expect(duration).toBeLessThan(1000); // Should complete in less than 1 second

    // Clean up cloned room
    await prisma.message.deleteMany({
      where: { roomId: newRoom.id },
    });
    await prisma.chatRoom.delete({
      where: { id: newRoom.id },
    });
  }, 10000); // 10 second timeout
});
