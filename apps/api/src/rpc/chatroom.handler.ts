import type { ServiceImpl, HandlerContext } from '@connectrpc/connect';
import { Code, ConnectError } from '@connectrpc/connect';
import { ChatRoomService } from '@persona-chat/proto/gen/ts/chatroom_connect.js';
import { prisma } from '../config/prisma.js';
import { userContextKey } from '../context.js';

export const chatRoomHandler: ServiceImpl<typeof ChatRoomService> = {
  async listChatRooms(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    const limit = req.limit || 20;
    const offset = req.offset || 0;

    const where: any = { userId: user.id };
    if (req.characterId) {
      where.characterId = req.characterId;
    }

    const [chatRooms, total] = await Promise.all([
      prisma.chatRoom.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ isPinned: 'desc' }, { lastMessageAt: 'desc' }],
        include: {
          character: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              tagline: true,
            },
          },
          persona: {
            select: {
              id: true,
              name: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              content: true,
              role: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
      prisma.chatRoom.count({ where }),
    ]);

    return {
      chatRooms: chatRooms.map((room) => {
        const lastMessage = room.messages[0];
        return {
          id: room.id,
          userId: room.userId,
          characterId: room.characterId,
          personaId: room.personaId || undefined,
          title: room.title || undefined,
          userNote: room.userNote || undefined,
          conversationSummary: room.conversationSummary || undefined,
          lastMessageAt: room.lastMessageAt?.toISOString() || undefined,
          isPinned: room.isPinned,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString(),
          messageCount: room._count.messages,
          characterName: room.character.name,
          characterImageUrl: room.character.imageUrl || undefined,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                role: lastMessage.role,
              }
            : undefined,
        };
      }),
      total,
      hasMore: offset + chatRooms.length < total,
    };
  },

  async getChatRoom(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: req.id },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            tagline: true,
            greeting: true,
            data: true,
            lorebook: true,
          },
        },
        persona: {
          select: {
            id: true,
            name: true,
            persona: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!chatRoom) {
      throw new ConnectError('Chat room not found', Code.NotFound);
    }

    // Verify ownership
    if (chatRoom.userId !== user.id) {
      throw new ConnectError('Forbidden', Code.PermissionDenied);
    }

    // Extract situational images from character data
    let situationalImages: any[] = [];
    try {
      const characterData = chatRoom.character.data as any;
      if (characterData?.situationalImages) {
        situationalImages = characterData.situationalImages;
      }
    } catch (e) {
      // Ignore parse errors
    }

    return {
      chatRoom: {
        id: chatRoom.id,
        userId: chatRoom.userId,
        characterId: chatRoom.characterId,
        personaId: chatRoom.personaId || undefined,
        title: chatRoom.title || undefined,
        userNote: chatRoom.userNote || undefined,
        conversationSummary: chatRoom.conversationSummary || undefined,
        lastMessageAt: chatRoom.lastMessageAt?.toISOString() || undefined,
        isPinned: chatRoom.isPinned,
        createdAt: chatRoom.createdAt.toISOString(),
        updatedAt: chatRoom.updatedAt.toISOString(),
        character: {
          id: chatRoom.character.id,
          name: chatRoom.character.name,
          imageUrl: chatRoom.character.imageUrl || undefined,
          tagline: chatRoom.character.tagline || undefined,
          situationalImages,
        },
        persona: chatRoom.persona
          ? {
              id: chatRoom.persona.id,
              name: chatRoom.persona.name,
            }
          : undefined,
        messageCount: chatRoom._count.messages,
        lastMessage: undefined,
        characterName: chatRoom.character.name,
        characterImageUrl: chatRoom.character.imageUrl || undefined,
      },
    };
  },

  async createChatRoom(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Verify character exists
    const character = await prisma.character.findUnique({
      where: { id: req.characterId },
      select: { id: true, name: true, imageUrl: true, greeting: true, data: true },
    });

    if (!character) {
      throw new ConnectError('Character not found', Code.NotFound);
    }

    // Verify persona exists and belongs to user (if provided)
    if (req.personaId) {
      const persona = await prisma.userPersona.findUnique({
        where: { id: req.personaId },
      });

      if (!persona || persona.userId !== user.id) {
        throw new ConnectError('Persona not found or forbidden', Code.PermissionDenied);
      }
    }

    const chatRoom = await prisma.chatRoom.create({
      data: {
        userId: user.id,
        characterId: req.characterId,
        personaId: req.personaId || undefined,
        userNote: req.userNote || undefined,
      },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            tagline: true,
          },
        },
        persona: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    // Add initial greeting message
    let greetingContent = '';

    // Try to get greeting from data.greetings array (new wizard format)
    if (character.data && typeof character.data === 'object') {
      const data = character.data as any;
      if (Array.isArray(data.greetings) && data.greetings.length > 0) {
        // Find default greeting or use first one
        const defaultGreeting = data.greetings.find((g: any) => g.isDefault);
        const greeting = defaultGreeting || data.greetings[0];
        greetingContent = greeting.content || '';
      }
    }

    // Fallback to legacy greeting field
    if (!greetingContent && character.greeting) {
      greetingContent = character.greeting;
    }

    // Create greeting message if we have content
    if (greetingContent) {
      await prisma.message.create({
        data: {
          roomId: chatRoom.id,
          role: 'assistant',
          content: greetingContent,
        },
      });
    }

    return {
      chatRoom: {
        id: chatRoom.id,
        userId: chatRoom.userId,
        characterId: chatRoom.characterId,
        personaId: chatRoom.personaId || undefined,
        title: chatRoom.title || undefined,
        userNote: chatRoom.userNote || undefined,
        conversationSummary: chatRoom.conversationSummary || undefined,
        lastMessageAt: chatRoom.lastMessageAt?.toISOString() || undefined,
        isPinned: chatRoom.isPinned,
        createdAt: chatRoom.createdAt.toISOString(),
        updatedAt: chatRoom.updatedAt.toISOString(),
        character: {
          id: chatRoom.character.id,
          name: chatRoom.character.name,
          imageUrl: chatRoom.character.imageUrl || undefined,
          tagline: chatRoom.character.tagline || undefined,
        },
        persona: chatRoom.persona
          ? {
              id: chatRoom.persona.id,
              name: chatRoom.persona.name,
            }
          : undefined,
        messageCount: chatRoom._count.messages,
        lastMessage: undefined,
      },
    };
  },

  async updateChatRoom(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Verify ownership
    const existing = await prisma.chatRoom.findUnique({
      where: { id: req.id },
    });

    if (!existing) {
      throw new ConnectError('Chat room not found', Code.NotFound);
    }

    if (existing.userId !== user.id) {
      throw new ConnectError('Forbidden', Code.PermissionDenied);
    }

    // Build update data
    const updateData: any = {};
    if (req.personaId !== undefined) updateData.personaId = req.personaId;
    if (req.userNote !== undefined) updateData.userNote = req.userNote;
    if (req.conversationSummary !== undefined) updateData.conversationSummary = req.conversationSummary;
    if (req.isPinned !== undefined) updateData.isPinned = req.isPinned;
    if (req.title !== undefined) updateData.title = req.title;

    const chatRoom = await prisma.chatRoom.update({
      where: { id: req.id },
      data: updateData,
      include: {
        character: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            tagline: true,
          },
        },
        persona: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return {
      chatRoom: {
        id: chatRoom.id,
        userId: chatRoom.userId,
        characterId: chatRoom.characterId,
        personaId: chatRoom.personaId || undefined,
        title: chatRoom.title || undefined,
        userNote: chatRoom.userNote || undefined,
        conversationSummary: chatRoom.conversationSummary || undefined,
        lastMessageAt: chatRoom.lastMessageAt?.toISOString() || undefined,
        isPinned: chatRoom.isPinned,
        createdAt: chatRoom.createdAt.toISOString(),
        updatedAt: chatRoom.updatedAt.toISOString(),
        character: {
          id: chatRoom.character.id,
          name: chatRoom.character.name,
          imageUrl: chatRoom.character.imageUrl || undefined,
          tagline: chatRoom.character.tagline || undefined,
        },
        persona: chatRoom.persona
          ? {
              id: chatRoom.persona.id,
              name: chatRoom.persona.name,
            }
          : undefined,
        messageCount: chatRoom._count.messages,
        lastMessage: undefined,
      },
    };
  },

  async deleteChatRoom(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Verify ownership
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: req.id },
    });

    if (!chatRoom) {
      throw new ConnectError('Chat room not found', Code.NotFound);
    }

    if (chatRoom.userId !== user.id) {
      throw new ConnectError('Forbidden', Code.PermissionDenied);
    }

    await prisma.chatRoom.delete({
      where: { id: req.id },
    });

    return { success: true };
  },

  async listMessages(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Verify room ownership
    const room = await prisma.chatRoom.findUnique({
      where: { id: req.roomId },
    });

    if (!room) {
      throw new ConnectError('Chat room not found', Code.NotFound);
    }

    if (room.userId !== user.id) {
      throw new ConnectError('Forbidden', Code.PermissionDenied);
    }

    const limit = req.limit || 50;
    const offset = req.offset || 0;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { roomId: req.roomId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'asc' },
        include: {
          _count: {
            select: {
              versions: true,
            },
          },
          userReactions: {
            where: { userId: user.id },
          },
        },
      }),
      prisma.message.count({ where: { roomId: req.roomId } }),
    ]);

    return {
      messages: messages.map((msg) => {
        // Extract triggered images from metadata
        const metadata = msg.metadata as any;
        const triggeredImages = metadata?.triggeredImages || [];

        return {
          id: msg.id,
          roomId: msg.roomId,
          role: msg.role,
          content: msg.content,
          modelSlug: msg.modelSlug || undefined,
          versionNumber: msg.versionNumber,
          parentMessageId: msg.parentMessageId || undefined,
          positiveReactionCount: msg.positiveReactionCount,
          negativeReactionCount: msg.negativeReactionCount,
          createdAt: msg.createdAt.toISOString(),
          updatedAt: msg.updatedAt.toISOString(),
          triggeredImages,
          metadataJson: msg.metadata ? JSON.stringify(msg.metadata) : undefined,
          userReaction: msg.userReactions[0] ? {
            reactionType: msg.userReactions[0].reactionType,
            createdAt: msg.userReactions[0].createdAt.toISOString(),
          } : undefined,
        };
      }),
      total,
      hasMore: offset + messages.length < total,
    };
  },

  async cloneChatRoom(req, context: HandlerContext) {
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Fetch source room with messages
    const sourceRoom = await prisma.chatRoom.findUnique({
      where: { id: req.sourceRoomId },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            tagline: true,
          },
        },
        persona: {
          select: {
            id: true,
            name: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            content: true,
            modelSlug: true,
            metadata: true,
          },
        },
      },
    });

    if (!sourceRoom || sourceRoom.userId !== user.id) {
      throw new ConnectError('Room not found or forbidden', Code.PermissionDenied);
    }

    // Create new room
    const newRoom = await prisma.chatRoom.create({
      data: {
        userId: user.id,
        characterId: sourceRoom.characterId,
        personaId: req.personaId || sourceRoom.personaId,
        title: `${sourceRoom.title || sourceRoom.character.name} (Copy)`,
        lastMessageAt: new Date(),
      },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            tagline: true,
          },
        },
        persona: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    // Clone messages
    for (const msg of sourceRoom.messages) {
      await prisma.message.create({
        data: {
          roomId: newRoom.id,
          role: msg.role,
          content: msg.content,
          modelSlug: msg.modelSlug,
          metadata: msg.metadata as any,
        },
      });
    }

    return {
      chatRoom: {
        id: newRoom.id,
        userId: newRoom.userId,
        characterId: newRoom.characterId,
        personaId: newRoom.personaId || undefined,
        title: newRoom.title || undefined,
        userNote: newRoom.userNote || undefined,
        conversationSummary: newRoom.conversationSummary || undefined,
        lastMessageAt: newRoom.lastMessageAt?.toISOString() || undefined,
        isPinned: newRoom.isPinned,
        createdAt: newRoom.createdAt.toISOString(),
        updatedAt: newRoom.updatedAt.toISOString(),
        character: {
          id: newRoom.character.id,
          name: newRoom.character.name,
          imageUrl: newRoom.character.imageUrl || undefined,
          tagline: newRoom.character.tagline || undefined,
        },
        persona: newRoom.persona
          ? {
              id: newRoom.persona.id,
              name: newRoom.persona.name,
            }
          : undefined,
        messageCount: sourceRoom.messages.length,
        characterName: newRoom.character.name,
        characterImageUrl: newRoom.character.imageUrl || undefined,
        lastMessage: undefined,
      },
    };
  },

  async findRecentRoomByCharacter(req, context: HandlerContext) {
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    const room = await prisma.chatRoom.findFirst({
      where: {
        userId: user.id,
        characterId: req.characterId,
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            tagline: true,
          },
        },
        persona: {
          select: {
            id: true,
            name: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            role: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!room) {
      return { chatRoom: undefined };
    }

    const lastMessage = room.messages[0];

    return {
      chatRoom: {
        id: room.id,
        userId: room.userId,
        characterId: room.characterId,
        personaId: room.personaId || undefined,
        title: room.title || undefined,
        userNote: room.userNote || undefined,
        conversationSummary: room.conversationSummary || undefined,
        lastMessageAt: room.lastMessageAt?.toISOString() || undefined,
        isPinned: room.isPinned,
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
        character: {
          id: room.character.id,
          name: room.character.name,
          imageUrl: room.character.imageUrl || undefined,
          tagline: room.character.tagline || undefined,
        },
        persona: room.persona
          ? {
              id: room.persona.id,
              name: room.persona.name,
            }
          : undefined,
        messageCount: room._count.messages,
        characterName: room.character.name,
        characterImageUrl: room.character.imageUrl || undefined,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              createdAt: room.lastMessageAt?.toISOString() || '',
            }
          : undefined,
      },
    };
  },
};
