import type { ServiceImpl, HandlerContext } from '@connectrpc/connect';
import { Code, ConnectError } from '@connectrpc/connect';
import { CharacterService } from '@persona-chat/proto/gen/ts/character_connect.js';
import { CharacterService as CharacterAppService } from '../application/services/CharacterService.js';
import { CharacterDetail, CharacterWithRelations } from '../domain/repositories/ICharacterRepository.js';
import { userContextKey } from '../context.js';
import { safeJSONParseOptional } from '../utils/safe-json.js';

function mapCharacterListItemToProto(char: CharacterWithRelations) {
  return {
    id: char.id,
    name: char.name,
    tagline: char.tagline || undefined,
    description: char.description || undefined,
    greeting: char.greeting || undefined,
    imageUrl: char.imageUrl || undefined,
    bannerImageUrl: char.bannerImageUrl || undefined,
    visibility: char.visibility,
    isNsfw: char.isNsfw,
    creatorId: char.creatorId,
    universeId: char.universeId || undefined,
    keywords: char.keywords,
    // data/lorebook은 리스트에서 제외 (무거운 필드)
    dataJson: undefined,
    lorebookJson: undefined,
    createdAt: char.createdAt.toISOString(),
    updatedAt: char.updatedAt.toISOString(),
    totalChatCount: char._count?.chatRooms ?? 0,
    totalMessageCount: 0,
    avgRating: 0,
    creatorDisplayName: (char.creator as any)?.displayName ?? '',
  };
}

function mapCharacterDetailToProto(char: CharacterDetail) {
  return {
    id: char.id,
    name: char.name,
    tagline: char.tagline || undefined,
    description: char.description || undefined,
    aiPromptDescription: char.aiPromptDescription || undefined,
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
    totalChatCount: char._count?.chatRooms ?? 0,
    totalMessageCount: 0,
    avgRating: 0,
    creatorDisplayName: (char.creator as any)?.displayName ?? '',
    defaultLlmModelId: (char as any).defaultLlmModelId || undefined,
  };
}

function toNotFound(error: unknown): never {
  if (error instanceof Error) {
    throw new ConnectError(error.message, Code.NotFound);
  }
  throw error;
}

export function createCharacterHandler(
  characterService: CharacterAppService
): ServiceImpl<typeof CharacterService> {
  return {
    async listCharacters(req) {
      const { characters, total, hasMore } = await characterService.listCharacters({
        keyword: req.keyword || undefined,
        name: req.name || undefined,
        visibility: req.visibility as any || undefined,
        isNsfw: req.isNsfw !== undefined ? req.isNsfw : undefined,
        creatorId: req.creatorId || undefined,
        universeId: req.universeId || undefined,
        limit: req.limit || 16,
        offset: req.offset || 0,
      });

      return {
        characters: characters.map(mapCharacterListItemToProto),
        total,
        hasMore,
      };
    },

    async getCharacter(req) {
      const character = await characterService.getCharacter(req.id);
      if (!character) throw new ConnectError('Character not found', Code.NotFound);

      return { character: mapCharacterDetailToProto(character) };
    },

    async createCharacter(req, context: HandlerContext) {
      const user = context.values.get(userContextKey);
      if (!user) throw new ConnectError('Unauthorized', Code.Unauthenticated);

      const character = await characterService.createCharacter({
        name: req.name,
        creatorId: user.id,
        tagline: req.tagline || undefined,
        description: req.description || undefined,
        aiPromptDescription: req.aiPromptDescription || undefined,
        greeting: req.greeting || undefined,
        imageUrl: req.imageUrl || undefined,
        bannerImageUrl: req.bannerImageUrl || undefined,
        visibility: (req.visibility as any) || 'public',
        isNsfw: req.isNsfw || false,
        universeId: req.universeId || undefined,
        keywords: req.keywords || [],
        data: safeJSONParseOptional(req.dataJson, 'dataJson', {}),
        lorebook: safeJSONParseOptional(req.lorebookJson, 'lorebookJson', null),
        defaultLlmModelId: req.defaultLlmModelId || undefined,
      });

      return {
        character: {
          ...mapCharacterDetailToProto(character as CharacterDetail),
          totalChatCount: 0,
        },
      };
    },

    async updateCharacter(req, context: HandlerContext) {
      const user = context.values.get(userContextKey);
      if (!user) throw new ConnectError('Unauthorized', Code.Unauthenticated);

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
      if (req.dataJson !== undefined) {
        updateData.data = safeJSONParseOptional(req.dataJson, 'dataJson', {});
      }
      if (req.lorebookJson !== undefined) {
        updateData.lorebook = safeJSONParseOptional(req.lorebookJson, 'lorebookJson', null);
      }
      if (req.defaultLlmModelId !== undefined) updateData.defaultLlmModelId = req.defaultLlmModelId;

      const character = await characterService
        .updateCharacter(req.id, user.id, updateData)
        .catch(toNotFound);

      return { character: mapCharacterDetailToProto(character as CharacterDetail) };
    },

    async deleteCharacter(req, context: HandlerContext) {
      const user = context.values.get(userContextKey);
      if (!user) throw new ConnectError('Unauthorized', Code.Unauthenticated);

      await characterService.deleteCharacter(req.id, user.id).catch(toNotFound);

      return { success: true };
    },

    async listCharactersByUniverse(req) {
      const characters = await characterService.listCharactersByUniverse(req.universeId);

      return {
        characters: characters.map((char) => ({
          id: char.id,
          name: char.name,
          imageUrl: char.imageUrl || undefined,
          tagline: char.tagline || undefined,
          description: char.description || undefined,
        })),
      };
    },
  };
}
