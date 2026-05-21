import type { ServiceImpl, HandlerContext } from '@connectrpc/connect';
import { Code, ConnectError } from '@connectrpc/connect';
import { UniverseService } from '@persona-chat/proto/gen/ts/universe_connect.js';
import { prisma } from '../config/prisma.js';
import { userContextKey } from '../context.js';

export const universeHandler: ServiceImpl<typeof UniverseService> = {
  async listUniverses(req) {
    // Build where clause from request filters
    const where: any = {};

    if (req.visibility) {
      where.visibility = req.visibility;
    }

    if (req.creatorId) {
      where.creatorId = req.creatorId;
    }

    // Unified search across multiple fields
    if (req.keyword) {
      where.OR = [
        { name: { contains: req.keyword, mode: 'insensitive' } },
        { description: { contains: req.keyword, mode: 'insensitive' } },
        { tags: { has: req.keyword } },
        { genre: { contains: req.keyword, mode: 'insensitive' } },
        { creator: { displayName: { contains: req.keyword, mode: 'insensitive' } } },
      ];
    }

    // Execute query with pagination
    const limit = req.limit || 16;
    const offset = req.offset || 0;

    // Optimized: use select to exclude heavy JSON fields (lorebook, data) in list view
    const [universes, total] = await Promise.all([
      prisma.universe.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          creatorId: true,
          visibility: true,
          imageUrl: true,
          genre: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: {
              displayName: true,
            },
          },
          _count: {
            select: {
              characters: true,
            },
          },
        },
      }),
      prisma.universe.count({ where }),
    ]);

    // Map to proto response
    return {
      universes: universes.map((universe: any) => ({
        id: universe.id,
        name: universe.name,
        description: universe.description || undefined,
        creatorId: universe.creatorId,
        visibility: universe.visibility,
        imageUrl: universe.imageUrl || undefined,
        genre: universe.genre || undefined,
        tags: universe.tags,
        lorebookJson: undefined, // Excluded for performance (use getUniverse for full data)
        dataJson: undefined, // Excluded for performance (use getUniverse for full data)
        createdAt: universe.createdAt.toISOString(),
        updatedAt: universe.updatedAt.toISOString(),
        characterCount: universe._count.characters,
        creatorDisplayName: universe.creator.displayName,
      })),
      total,
      hasMore: offset + universes.length < total,
    };
  },

  async getUniverse(req) {
    const universe = await prisma.universe.findUnique({
      where: { id: req.id },
      include: {
        creator: {
          select: {
            displayName: true,
          },
        },
        _count: {
          select: { characters: true },
        },
      },
    });

    if (!universe) {
      throw new ConnectError('Universe not found', Code.NotFound);
    }

    return {
      universe: {
        id: universe.id,
        name: universe.name,
        description: universe.description || undefined,
        creatorId: universe.creatorId,
        visibility: universe.visibility,
        imageUrl: universe.imageUrl || undefined,
        genre: universe.genre || undefined,
        tags: universe.tags,
        lorebookJson: universe.lorebook ? JSON.stringify(universe.lorebook) : undefined,
        dataJson: JSON.stringify(universe.data),
        createdAt: universe.createdAt.toISOString(),
        updatedAt: universe.updatedAt.toISOString(),
        characterCount: universe._count.characters,
        creatorDisplayName: universe.creator.displayName,
      },
    };
  },

  async createUniverse(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Parse JSON fields
    const data = req.dataJson ? JSON.parse(req.dataJson) : {};
    const lorebook = req.lorebookJson ? JSON.parse(req.lorebookJson) : null;

    const universe = await prisma.universe.create({
      data: {
        name: req.name,
        description: req.description || undefined,
        visibility: req.visibility || 'public',
        imageUrl: req.imageUrl || undefined,
        genre: req.genre || undefined,
        tags: req.tags || [],
        data,
        lorebook,
        creatorId: user.id,
      },
      include: {
        creator: {
          select: {
            displayName: true,
          },
        },
        _count: {
          select: { characters: true },
        },
      },
    });

    return {
      universe: {
        id: universe.id,
        name: universe.name,
        description: universe.description || undefined,
        creatorId: universe.creatorId,
        visibility: universe.visibility,
        imageUrl: universe.imageUrl || undefined,
        genre: universe.genre || undefined,
        tags: universe.tags,
        lorebookJson: universe.lorebook ? JSON.stringify(universe.lorebook) : undefined,
        dataJson: JSON.stringify(universe.data),
        createdAt: universe.createdAt.toISOString(),
        updatedAt: universe.updatedAt.toISOString(),
        characterCount: universe._count.characters,
        creatorDisplayName: universe.creator.displayName,
      },
    };
  },

  async updateUniverse(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Verify ownership
    const existing = await prisma.universe.findUnique({
      where: { id: req.id },
    });

    if (!existing) {
      throw new ConnectError('Universe not found', Code.NotFound);
    }

    if (existing.creatorId !== user.id) {
      throw new ConnectError('Forbidden', Code.PermissionDenied);
    }

    // Build update data
    const updateData: any = {};

    if (req.name !== undefined) updateData.name = req.name;
    if (req.description !== undefined) updateData.description = req.description;
    if (req.visibility !== undefined) updateData.visibility = req.visibility;
    if (req.imageUrl !== undefined) updateData.imageUrl = req.imageUrl;
    if (req.genre !== undefined) updateData.genre = req.genre;
    if (req.tags !== undefined) updateData.tags = req.tags;
    if (req.dataJson !== undefined) updateData.data = JSON.parse(req.dataJson);
    if (req.lorebookJson !== undefined) {
      updateData.lorebook = req.lorebookJson ? JSON.parse(req.lorebookJson) : null;
    }

    const universe = await prisma.universe.update({
      where: { id: req.id },
      data: updateData,
      include: {
        creator: {
          select: {
            displayName: true,
          },
        },
        _count: {
          select: { characters: true },
        },
      },
    });

    return {
      universe: {
        id: universe.id,
        name: universe.name,
        description: universe.description || undefined,
        creatorId: universe.creatorId,
        visibility: universe.visibility,
        imageUrl: universe.imageUrl || undefined,
        genre: universe.genre || undefined,
        tags: universe.tags,
        lorebookJson: universe.lorebook ? JSON.stringify(universe.lorebook) : undefined,
        dataJson: JSON.stringify(universe.data),
        createdAt: universe.createdAt.toISOString(),
        updatedAt: universe.updatedAt.toISOString(),
        characterCount: universe._count.characters,
        creatorDisplayName: universe.creator.displayName,
      },
    };
  },

  async deleteUniverse(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Verify ownership
    const universe = await prisma.universe.findUnique({
      where: { id: req.id },
    });

    if (!universe) {
      throw new ConnectError('Universe not found', Code.NotFound);
    }

    if (universe.creatorId !== user.id) {
      throw new ConnectError('Forbidden', Code.PermissionDenied);
    }

    await prisma.universe.delete({
      where: { id: req.id },
    });

    return { success: true };
  },
};
