export interface LorebookEntry {
  id: string;
  name: string;
  content: string;
  keywords: string[];
  isSecret: boolean;
}

export interface UniverseFormData {
  // Step 1: Introduction
  name: string;
  genre: string;
  imageUrl: string;
  description: string;

  // Step 2: Settings
  worldSettings: string;

  // Step 3: Lorebook
  lorebookEntries: LorebookEntry[];

  // Step 4: Registration
  visibility: 'public' | 'private';
  preference: 'bl' | 'hl' | '';
  tags: string[];
  customTags: string[];
}

export interface UniverseDraft {
  id: string;
  formData: UniverseFormData;
  savedAt: string;
  thumbnailUrl?: string;
}

export function saveUniverseDraft(userId: string, formData: UniverseFormData): string {
  const drafts = getUniverseDrafts(userId);
  const draftId = Date.now().toString();

  drafts.unshift({
    id: draftId,
    formData,
    savedAt: new Date().toISOString(),
    thumbnailUrl: formData.imageUrl,
  });

  // Keep only the 10 most recent drafts
  const recentDrafts = drafts.slice(0, 10);

  localStorage.setItem(`universe_drafts_${userId}`, JSON.stringify(recentDrafts));
  return draftId;
}

export function getUniverseDrafts(userId: string): UniverseDraft[] {
  if (typeof window === 'undefined') return [];

  const draftsJson = localStorage.getItem(`universe_drafts_${userId}`);
  return draftsJson ? JSON.parse(draftsJson) : [];
}

export function deleteUniverseDraft(userId: string, draftId: string): void {
  const drafts = getUniverseDrafts(userId);
  const filtered = drafts.filter((d) => d.id !== draftId);
  localStorage.setItem(`universe_drafts_${userId}`, JSON.stringify(filtered));
}

export function loadUniverseDraft(userId: string, draftId: string): UniverseFormData | null {
  const drafts = getUniverseDrafts(userId);
  const draft = drafts.find((d) => d.id === draftId);
  return draft ? draft.formData : null;
}

export function clearAllUniverseDrafts(userId: string): void {
  localStorage.removeItem(`universe_drafts_${userId}`);
}

export function getEmptyUniverseFormData(): UniverseFormData {
  return {
    name: '',
    genre: '',
    imageUrl: '',
    description: '',
    worldSettings: '',
    lorebookEntries: [],
    visibility: 'public',
    preference: '',
    tags: [],
    customTags: [],
  };
}
