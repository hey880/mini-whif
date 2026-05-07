import { WithTimestamps } from './common';

/**
 * Character and Universe types
 */

export interface Universe {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterData {
  personality?: string;
  scenario?: string;
  exampleDialogues?: string[];
  firstMessage?: string;
  systemPrompt?: string;
  [key: string]: any;
}

export interface CharacterLorebook {
  entries?: LorebookEntry[];
  worldInfo?: string;
  [key: string]: any;
}

export interface LorebookEntry {
  id?: string;
  keys: string[];
  content: string;
  priority?: number;
  enabled?: boolean;
}

export interface Character extends WithTimestamps {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  greeting?: string;
  imageUrl?: string;
  bannerImageUrl?: string;
  visibility: 'public' | 'private' | 'unlisted';
  isNsfw: boolean;
  creatorId: string;
  universeId?: string;
  keywords: string[];
  data: CharacterData;
  lorebook?: CharacterLorebook;

  // Computed fields
  totalChatCount?: number;
  totalMessageCount?: number;
  avgRating?: number;
}

export interface CharacterWithStats extends Character {
  totalChatCount: number;
  totalMessageCount: number;
  avgRating: number;
}

export interface CharacterListItem {
  id: string;
  name: string;
  tagline?: string;
  imageUrl?: string;
  isNsfw: boolean;
  keywords: string[];
  totalChatCount: number;
  totalMessageCount: number;
}

export interface CharacterFilterParams {
  keyword?: string;
  name?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  isNsfw?: boolean;
  creatorId?: string;
  universeId?: string;
}

export interface CreateCharacterInput {
  name: string;
  tagline?: string;
  description?: string;
  greeting?: string;
  imageUrl?: string;
  bannerImageUrl?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  isNsfw?: boolean;
  universeId?: string;
  keywords?: string[];
  data?: CharacterData;
  lorebook?: CharacterLorebook;
}

export interface UpdateCharacterInput extends Partial<CreateCharacterInput> {
  id: string;
}
