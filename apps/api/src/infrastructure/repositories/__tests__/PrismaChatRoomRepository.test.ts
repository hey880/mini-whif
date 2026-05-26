import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaChatRoomRepository } from '../PrismaChatRoomRepository.js';

const prisma = new PrismaClient();

describe('PrismaChatRoomRepository', () => {
  let repo: PrismaChatRoomRepository;
  let testUserId: string;
  let testCharacterId: string;
  let testRoomId: string;

  beforeEach(async () => {
    repo = new PrismaChatRoomRepository(prisma);

    // Create test user
    testUserId = randomUUID();
    await prisma.profile.create({
      data: {
        id: testUserId,
        email: `test-${randomUUID()}@example.com`,
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

    // Create test chat room
    const room = await prisma.chatRoom.create({
      data: {
        userId: testUserId,
        characterId: testCharacterId,
        title: 'Test Room',
      },
    });
    testRoomId = room.id;
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

  describe('findById', () => {
    it('should find chat room by id with relations', async () => {
      const room = await repo.findById(testRoomId, testUserId);

      expect(room).toBeDefined();
      expect(room!.id).toBe(testRoomId);
      expect(room!.character).toBeDefined();
      expect(room!.character!.name).toBe('Test Character');
      expect(room!._count).toBeDefined();
    });

    it('should return null for non-existent room', async () => {
      const room = await repo.findById(randomUUID(), testUserId); // Use valid UUID format

      expect(room).toBeNull();
    });

    it('should return null for room owned by different user', async () => {
      const otherUserId = randomUUID();
      const room = await repo.findById(testRoomId, otherUserId);

      expect(room).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should find rooms with pagination', async () => {
      // Create additional rooms
      await prisma.chatRoom.create({
        data: {
          userId: testUserId,
          characterId: testCharacterId,
          title: 'Test Room 2',
        },
      });

      const result = await repo.findMany({
        userId: testUserId,
        limit: 10,
        offset: 0,
      });

      expect(result.rooms.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThanOrEqual(result.rooms.length);
    });

    it('should filter by characterId', async () => {
      const result = await repo.findMany({
        userId: testUserId,
        characterId: testCharacterId,
      });

      expect(result.rooms.every((room) => room.characterId === testCharacterId)).toBe(true);
    });
  });

  describe('create', () => {
    it('should create new chat room', async () => {
      const room = await repo.create({
        userId: testUserId,
        characterId: testCharacterId,
        title: 'New Room',
      });

      expect(room).toBeDefined();
      expect(room.title).toBe('New Room');
      expect(room.userId).toBe(testUserId);
      expect(room.characterId).toBe(testCharacterId);

      // Clean up
      await prisma.chatRoom.delete({ where: { id: room.id } });
    });
  });

  describe('update', () => {
    it('should update chat room', async () => {
      const updated = await repo.update(testRoomId, testUserId, {
        title: 'Updated Title',
      });

      expect(updated.title).toBe('Updated Title');
    });

    it('should throw error for room owned by different user', async () => {
      const otherUserId = randomUUID();

      await expect(
        repo.update(testRoomId, otherUserId, { title: 'Updated' })
      ).rejects.toThrow('Chat room not found or forbidden');
    });
  });

  describe('delete', () => {
    it('should delete chat room', async () => {
      const room = await repo.create({
        userId: testUserId,
        characterId: testCharacterId,
        title: 'To Delete',
      });

      await repo.delete(room.id, testUserId);

      const found = await repo.findById(room.id, testUserId);
      expect(found).toBeNull();
    });

    it('should throw error for room owned by different user', async () => {
      const otherUserId = randomUUID();

      await expect(repo.delete(testRoomId, otherUserId)).rejects.toThrow(
        'Chat room not found or forbidden'
      );
    });
  });

  describe('cloneWithMessages', () => {
    it('should clone chat room with messages efficiently', async () => {
      // Create 100 test messages
      const messages = Array.from({ length: 100 }, (_, i) => ({
        roomId: testRoomId,
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Test message ${i}`,
        modelSlug: 'test-model',
        metadata: {},
      }));

      await prisma.message.createMany({ data: messages });

      // Clone with performance test
      const startTime = Date.now();
      const clonedRoom = await repo.cloneWithMessages(testRoomId, testUserId);
      const duration = Date.now() - startTime;

      // Verify clone
      const clonedMessages = await prisma.message.count({
        where: { roomId: clonedRoom.id },
      });

      expect(clonedMessages).toBe(100);
      expect(clonedRoom.title).toContain('(Copy)');
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second

      // Clean up
      await prisma.message.deleteMany({ where: { roomId: clonedRoom.id } });
      await prisma.chatRoom.delete({ where: { id: clonedRoom.id } });
    }, 10000); // 10 second timeout

    it('should throw error for room owned by different user', async () => {
      const otherUserId = randomUUID();

      await expect(repo.cloneWithMessages(testRoomId, otherUserId)).rejects.toThrow(
        'Source room not found or forbidden'
      );
    });
  });
});
