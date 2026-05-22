import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaMessageRepository } from '../PrismaMessageRepository.js';

const prisma = new PrismaClient();

describe('PrismaMessageRepository', () => {
  let repo: PrismaMessageRepository;
  let testUserId: string;
  let testCharacterId: string;
  let testRoomId: string;

  beforeEach(async () => {
    repo = new PrismaMessageRepository(prisma);

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
    await prisma.messageVersion.deleteMany({
      where: { message: { roomId: testRoomId } },
    });
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

  describe('create', () => {
    it('should create new message', async () => {
      const message = await repo.create({
        roomId: testRoomId,
        role: 'user',
        content: 'Hello',
      });

      expect(message).toBeDefined();
      expect(message.content).toBe('Hello');
      expect(message.role).toBe('user');
      expect(message.roomId).toBe(testRoomId);
    });
  });

  describe('createMessagePair', () => {
    it('should create user and AI message pair', async () => {
      const pair = await repo.createMessagePair({
        roomId: testRoomId,
        userContent: 'Hello AI',
        modelSlug: 'test-model',
      });

      expect(pair.userMessage).toBeDefined();
      expect(pair.aiMessage).toBeDefined();
      expect(pair.userMessage.role).toBe('user');
      expect(pair.userMessage.content).toBe('Hello AI');
      expect(pair.aiMessage.role).toBe('assistant');
      expect(pair.aiMessage.content).toBe(''); // Placeholder
      expect(pair.aiMessage.modelSlug).toBe('test-model');
    });
  });

  describe('findById', () => {
    it('should find message by id', async () => {
      const created = await repo.create({
        roomId: testRoomId,
        role: 'user',
        content: 'Test',
      });

      const found = await repo.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it('should return null for non-existent message', async () => {
      const found = await repo.findById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('findByRoomId', () => {
    it('should find messages by room with pagination', async () => {
      // Create multiple messages
      await repo.create({
        roomId: testRoomId,
        role: 'user',
        content: 'Message 1',
      });
      await repo.create({
        roomId: testRoomId,
        role: 'assistant',
        content: 'Response 1',
      });

      const result = await repo.findByRoomId({
        roomId: testRoomId,
        limit: 10,
        offset: 0,
      });

      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThanOrEqual(result.messages.length);
    });
  });

  describe('update', () => {
    it('should update message content', async () => {
      const message = await repo.create({
        roomId: testRoomId,
        role: 'user',
        content: 'Original',
      });

      const updated = await repo.update(message.id, {
        content: 'Updated',
      });

      expect(updated.content).toBe('Updated');
    });
  });

  describe('delete', () => {
    it('should delete message', async () => {
      const message = await repo.create({
        roomId: testRoomId,
        role: 'user',
        content: 'To Delete',
      });

      await repo.delete(message.id);

      const found = await repo.findById(message.id);
      expect(found).toBeNull();
    });
  });

  describe('versioning', () => {
    it('should save message as version and increment version number', async () => {
      const message = await repo.create({
        roomId: testRoomId,
        role: 'assistant',
        content: 'Version 1',
        modelSlug: 'test-model',
      });

      const version = await repo.saveAsVersion(message.id);

      expect(version).toBeDefined();
      expect(version.content).toBe('Version 1');
      expect(version.versionNumber).toBe(1);

      // Check version number was incremented
      const updated = await repo.findById(message.id);
      expect(updated!.versionNumber).toBe(2);
    });

    it('should get all versions for a message', async () => {
      const message = await repo.create({
        roomId: testRoomId,
        role: 'assistant',
        content: 'Version 1',
        modelSlug: 'test-model',
      });

      // Create 3 versions
      await repo.saveAsVersion(message.id);
      await repo.update(message.id, { content: 'Version 2' });
      await repo.saveAsVersion(message.id);
      await repo.update(message.id, { content: 'Version 3' });
      await repo.saveAsVersion(message.id);

      const versions = await repo.getVersions(message.id);

      expect(versions.length).toBe(3);
      expect(versions[0].content).toBe('Version 1');
      expect(versions[1].content).toBe('Version 2');
      expect(versions[2].content).toBe('Version 3');
    });
  });
});
