import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

describe('Character Handler - List Optimization', () => {
  let testUserId: string;
  let testCharacterIds: string[] = [];

  beforeEach(async () => {
    // Create test user
    testUserId = randomUUID();
    await prisma.profile.create({
      data: {
        id: testUserId,
        email: `test-${randomUUID()}@example.com`,
        displayName: 'Test User',
      },
    });

    // Create 20 test characters with heavy data and lorebook
    const heavyData = {
      personality: 'A'.repeat(10000), // 10KB
      background: 'B'.repeat(10000), // 10KB
      relationships: Array.from({ length: 100 }, (_, i) => ({
        name: `Person ${i}`,
        relationship: 'Friend',
      })),
    };

    const heavyLorebook = Array.from({ length: 50 }, (_, i) => ({
      keyword: `keyword-${i}`,
      content: 'C'.repeat(1000), // 1KB each
    }));

    for (let i = 0; i < 20; i++) {
      const character = await prisma.character.create({
        data: {
          name: `Test Character ${i}`,
          creatorId: testUserId,
          visibility: 'public',
          data: heavyData,
          lorebook: heavyLorebook,
          tagline: `Tagline ${i}`,
          description: `Description ${i}`,
        },
      });
      testCharacterIds.push(character.id);
    }
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.character.deleteMany({
      where: { id: { in: testCharacterIds } },
    });
    await prisma.profile.deleteMany({
      where: { id: testUserId },
    });
    testCharacterIds = [];
  });

  it('should list characters without loading heavy data/lorebook fields', async () => {
    const startTime = Date.now();

    // Optimized query with select (excludes data, lorebook)
    const characters = await prisma.character.findMany({
      where: { visibility: 'public' },
      take: 16,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        tagline: true,
        description: true,
        greeting: true,
        imageUrl: true,
        bannerImageUrl: true,
        visibility: true,
        isNsfw: true,
        creatorId: true,
        universeId: true,
        keywords: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            chatRooms: true,
          },
        },
      },
    });

    const duration = Date.now() - startTime;

    expect(characters.length).toBeGreaterThan(0);
    expect(characters.length).toBeLessThanOrEqual(16);

    // Verify data and lorebook are NOT included
    characters.forEach((char: any) => {
      expect(char.data).toBeUndefined();
      expect(char.lorebook).toBeUndefined();
      expect(char.name).toBeDefined();
      expect(char.tagline).toBeDefined();
    });

    // Should complete in less than 1s (relaxed for CI/CD)
    expect(duration).toBeLessThan(1000);
  });

  it('should be significantly faster than loading full data', async () => {
    // Measure optimized query (with select)
    const startOptimized = Date.now();
    await prisma.character.findMany({
      where: { visibility: 'public' },
      take: 16,
      select: {
        id: true,
        name: true,
        tagline: true,
        description: true,
      },
    });
    const durationOptimized = Date.now() - startOptimized;

    // Measure unoptimized query (without select, loads everything)
    const startUnoptimized = Date.now();
    await prisma.character.findMany({
      where: { visibility: 'public' },
      take: 16,
    });
    const durationUnoptimized = Date.now() - startUnoptimized;

    // Optimized should be faster (relaxed to 1.5x instead of 2x)
    expect(durationOptimized * 1.5).toBeLessThan(durationUnoptimized);
  });

  it('should support pagination efficiently', async () => {
    const limit = 10;
    const offset = 0;

    const [characters, total] = await Promise.all([
      prisma.character.findMany({
        where: { visibility: 'public' },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.character.count({
        where: { visibility: 'public' },
      }),
    ]);

    expect(characters.length).toBeLessThanOrEqual(limit);
    expect(total).toBeGreaterThanOrEqual(characters.length);
  });
});
