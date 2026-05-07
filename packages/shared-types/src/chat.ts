import { WithTimestamps } from './common';

/**
 * Chat and Message types
 */

export interface ChatRoom extends WithTimestamps {
  id: string;
  userId: string;
  characterId: string;
  personaId?: string;
  userNote?: string;
  conversationSummary?: string;
  lastMessageAt?: Date;
  isPinned: boolean;
}

export interface ChatRoomWithCharacter extends ChatRoom {
  character: {
    id: string;
    name: string;
    imageUrl?: string;
    tagline?: string;
  };
  messageCount?: number;
  lastMessage?: {
    content: string;
    createdAt: Date;
  };
}

export interface Message extends WithTimestamps {
  id: string;
  roomId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelSlug?: string;
  versionNumber: number;
  parentMessageId?: string;
  positiveReactionCount: number;
  negativeReactionCount: number;
}

export interface MessageVersion {
  id: string;
  messageId: string;
  content: string;
  versionNumber: number;
  modelSlug?: string;
  createdAt: Date;
}

export interface MessageWithVersions extends Message {
  versions?: MessageVersion[];
}

export interface UserReaction {
  id: string;
  userId: string;
  messageId: string;
  reactionType: 'positive' | 'negative';
  createdAt: Date;
}

export interface CreateChatRoomInput {
  characterId: string;
  personaId?: string;
  userNote?: string;
}

export interface UpdateChatRoomInput {
  id: string;
  personaId?: string;
  userNote?: string;
  conversationSummary?: string;
  isPinned?: boolean;
}

export interface SendMessageInput {
  roomId: string;
  content: string;
}

export interface RegenerateMessageInput {
  roomId: string;
  messageId: string;
}

export interface RestoreVersionInput {
  messageId: string;
  versionNumber: number;
}

export interface ReactToMessageInput {
  messageId: string;
  reactionType: 'positive' | 'negative';
}
