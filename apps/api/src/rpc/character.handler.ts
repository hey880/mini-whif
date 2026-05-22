import type { ServiceImpl, HandlerContext } from '@connectrpc/connect';
import { Code, ConnectError } from '@connectrpc/connect';
import { CharacterService } from '@persona-chat/proto/gen/ts/character_connect.js';
import { prisma } from '../config/prisma.js';
import { userContextKey } from '../context.js';

export const characterHandler: ServiceImpl<typeof CharacterService> = {
  async listCharacters(req) {
    // Build where clause from request filters
    const where: any = {};

    // Unified search across multiple fields
    if (req.keyword) {
      where.OR = [
        { name: { contains: req.keyword, mode: 'insensitive' } },
        { keywords: { has: req.keyword } },
        { tagline: { contains: req.keyword, mode: 'insensitive' } },
        { universe: { name: { contains: req.keyword, mode: 'insensitive' } } },
        { creator: { displayName: { contains: req.keyword, mode: 'insensitive' } } },
      ];
    }

    if (req.name) {
      where.name = { contains: req.name, mode: 'insensitive' };
    }

    if (req.visibility) {
      where.visibility = req.visibility;
    }

    if (req.isNsfw !== undefined) {
      where.isNsfw = req.isNsfw;
    }

    if (req.creatorId) {
      where.creatorId = req.creatorId;
    }

    if (req.universeId) {
      where.universeId = req.universeId;
    }

    // Execute query with pagination
    const limit = req.limit || 16;
    const offset = req.offset || 0;

    // Optimized: use select instead of include to avoid loading heavy JSON fields (data, lorebook)
    const [characters, total] = await Promise.all([
      prisma.character.findMany({
        where,
        take: limit,
        skip: offset,
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
          universe: {
            select: {
              id: true,
              name: true,
            },
          },
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
      }),
      prisma.character.count({ where }),
    ]);

    // Map to proto response
    return {
      characters: characters.map((char: any) => ({
        id: char.id,
        name: char.name,
        tagline: char.tagline || undefined,
        description: char.description || undefined,
        // aiPromptDescription는 무거운 필드이므로 리스트에서는 제외 (getCharacter에서만 포함)
        greeting: char.greeting || undefined,
        imageUrl: char.imageUrl || undefined,
        bannerImageUrl: char.bannerImageUrl || undefined,
        visibility: char.visibility,
        isNsfw: char.isNsfw,
        creatorId: char.creatorId,
        universeId: char.universeId || undefined,
        keywords: char.keywords,
        dataJson: JSON.stringify(char.data),
        lorebookJson: char.lorebook ? JSON.stringify(char.lorebook) : undefined,
        createdAt: char.createdAt.toISOString(),
        updatedAt: char.updatedAt.toISOString(),
        totalChatCount: char._count.chatRooms,
        totalMessageCount: 0, // TODO: calculate from messages if needed
        avgRating: 0, // TODO: implement ratings if needed
        creatorDisplayName: char.creator.displayName,
      })),
      total,
      hasMore: offset + characters.length < total,
    };
  },

  async getCharacter(req) {
    const character = await prisma.character.findUnique({
      where: { id: req.id },
      include: {
        _count: {
          select: { chatRooms: true },
        },
        universe: true,
        creator: {
          select: {
            displayName: true,
          },
        },
      },
    });

    if (!character) {
      throw new ConnectError('Character not found', Code.NotFound);
    }

    return {
      character: {
        id: character.id,
        name: character.name,
        tagline: character.tagline || undefined,
        description: character.description || undefined,
        aiPromptDescription: character.aiPromptDescription || undefined,
        greeting: character.greeting || undefined,
        imageUrl: character.imageUrl || undefined,
        bannerImageUrl: character.bannerImageUrl || undefined,
        visibility: character.visibility,
        isNsfw: character.isNsfw,
        creatorId: character.creatorId,
        universeId: character.universeId || undefined,
        keywords: character.keywords,
        dataJson: JSON.stringify(character.data),
        lorebookJson: character.lorebook ? JSON.stringify(character.lorebook) : undefined,
        createdAt: character.createdAt.toISOString(),
        updatedAt: character.updatedAt.toISOString(),
        totalChatCount: character._count.chatRooms,
        totalMessageCount: 0,
        avgRating: 0,
        creatorDisplayName: character.creator.displayName,
      },
    };
  },

  async createCharacter(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Parse JSON fields
    const data = req.dataJson ? JSON.parse(req.dataJson) : {};
    const lorebook = req.lorebookJson ? JSON.parse(req.lorebookJson) : null;

    const character = await prisma.character.create({
      data: {
        name: req.name,
        tagline: req.tagline || undefined,
        description: req.description || undefined,
        aiPromptDescription: req.aiPromptDescription || undefined,
        greeting: req.greeting || undefined,
        imageUrl: req.imageUrl || undefined,
        bannerImageUrl: req.bannerImageUrl || undefined,
        visibility: req.visibility || 'public',
        isNsfw: req.isNsfw || false,
        creatorId: user.id,
        universeId: req.universeId || undefined,
        keywords: req.keywords || [],
        data,
        lorebook,
      },
    });

    return {
      character: {
        id: character.id,
        name: character.name,
        tagline: character.tagline || undefined,
        description: character.description || undefined,
        aiPromptDescription: character.aiPromptDescription || undefined,
        greeting: character.greeting || undefined,
        imageUrl: character.imageUrl || undefined,
        bannerImageUrl: character.bannerImageUrl || undefined,
        visibility: character.visibility,
        isNsfw: character.isNsfw,
        creatorId: character.creatorId,
        universeId: character.universeId || undefined,
        keywords: character.keywords,
        dataJson: JSON.stringify(character.data),
        lorebookJson: character.lorebook ? JSON.stringify(character.lorebook) : undefined,
        createdAt: character.createdAt.toISOString(),
        updatedAt: character.updatedAt.toISOString(),
        totalChatCount: 0,
        totalMessageCount: 0,
        avgRating: 0,
      },
    };
  },

  async updateCharacter(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Verify ownership
    const existing = await prisma.character.findUnique({
      where: { id: req.id },
    });

    if (!existing) {
      throw new ConnectError('Character not found', Code.NotFound);
    }

    if (existing.creatorId !== user.id) {
      throw new ConnectError('Forbidden', Code.PermissionDenied);
    }

    // Build update data
    const updateData: any = {};

    if (req.name) updateData.name = req.name;
    if (req.tagline !== undefined) updateData.tagline = req.tagline;
    if (req.description !== undefined) updateData.description = req.description;
    if (req.aiPromptDescription !== undefined) updateData.aiPromptDescription = req.aiPromptDescription;
    if (req.greeting !== undefined) updateData.greeting = req.greeting;
    if (req.imageUrl !== undefined) updateData.imageUrl = req.imageUrl;
    if (req.bannerImageUrl !== undefined) updateData.bannerImageUrl = req.bannerImageUrl;
    if (req.visibility !== undefined) updateData.visibility = req.visibility;
    if (req.isNsfw !== undefined) updateData.isNsfw = req.isNsfw;
    if (req.universeId !== undefined) updateData.universeId = req.universeId;
    if (req.keywords !== undefined) updateData.keywords = req.keywords;
    if (req.dataJson !== undefined) updateData.data = JSON.parse(req.dataJson);
    if (req.lorebookJson !== undefined) {
      updateData.lorebook = req.lorebookJson ? JSON.parse(req.lorebookJson) : null;
    }

    const character = await prisma.character.update({
      where: { id: req.id },
      data: updateData,
      include: {
        _count: {
          select: { chatRooms: true },
        },
      },
    });

    return {
      character: {
        id: character.id,
        name: character.name,
        tagline: character.tagline || undefined,
        description: character.description || undefined,
        aiPromptDescription: character.aiPromptDescription || undefined,
        greeting: character.greeting || undefined,
        imageUrl: character.imageUrl || undefined,
        bannerImageUrl: character.bannerImageUrl || undefined,
        visibility: character.visibility,
        isNsfw: character.isNsfw,
        creatorId: character.creatorId,
        universeId: character.universeId || undefined,
        keywords: character.keywords,
        dataJson: JSON.stringify(character.data),
        lorebookJson: character.lorebook ? JSON.stringify(character.lorebook) : undefined,
        createdAt: character.createdAt.toISOString(),
        updatedAt: character.updatedAt.toISOString(),
        totalChatCount: character._count.chatRooms,
        totalMessageCount: 0,
        avgRating: 0,
      },
    };
  },

  async deleteCharacter(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Verify ownership
    const character = await prisma.character.findUnique({
      where: { id: req.id },
    });

    if (!character) {
      throw new ConnectError('Character not found', Code.NotFound);
    }

    if (character.creatorId !== user.id) {
      throw new ConnectError('Forbidden', Code.PermissionDenied);
    }

    await prisma.character.delete({
      where: { id: req.id },
    });

    return { success: true };
  },

  async listCharactersByUniverse(req) {
    const characters = await prisma.character.findMany({
      where: {
        universeId: req.universeId,
        visibility: 'public',
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        tagline: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      characters: characters.map((char: any) => ({
        id: char.id,
        name: char.name,
        imageUrl: char.imageUrl || undefined,
        tagline: char.tagline || undefined,
        description: char.description || undefined,
      })),
    };
  },
};
