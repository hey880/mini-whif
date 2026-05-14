import { create } from 'zustand';
import type { UniverseFormData, LorebookEntry } from '@/lib/universeDraft';
import { getEmptyUniverseFormData, saveUniverseDraft, loadUniverseDraft } from '@/lib/universeDraft';

interface UniverseWizardState {
  // State
  isOpen: boolean;
  currentStep: number; // 1-4
  completedSteps: Set<number>;
  formData: UniverseFormData;
  editingUniverseId?: string;

  // Actions
  openWizard: (editingId?: string) => void;
  closeWizard: () => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<UniverseFormData>) => void;
  validateCurrentStep: () => boolean;
  getStepErrors: (step: number) => string[];
  resetWizard: () => void;
  markStepCompleted: (step: number) => void;

  // Lorebook management
  addLorebookEntry: (entry: LorebookEntry) => void;
  updateLorebookEntry: (id: string, updates: Partial<LorebookEntry>) => void;
  deleteLorebookEntry: (id: string) => void;

  // Draft management
  saveDraft: (userId: string) => string;
  loadDraft: (userId: string, draftId: string) => void;
  loadUniverse: (universe: any) => void;
}

export const useUniverseWizardStore = create<UniverseWizardState>((set, get) => ({
  // Initial state
  isOpen: false,
  currentStep: 1,
  completedSteps: new Set<number>(),
  formData: getEmptyUniverseFormData(),
  editingUniverseId: undefined,

  openWizard: (editingId?: string) => {
    set({
      isOpen: true,
      editingUniverseId: editingId,
      currentStep: 1,
      completedSteps: new Set<number>(),
      formData: getEmptyUniverseFormData(),
    });
  },

  closeWizard: () => {
    set({
      isOpen: false,
      currentStep: 1,
      completedSteps: new Set<number>(),
      formData: getEmptyUniverseFormData(),
      editingUniverseId: undefined,
    });
  },

  setStep: (step: number) => {
    if (step >= 1 && step <= 4) {
      set({ currentStep: step });
    }
  },

  nextStep: () => {
    const { currentStep, validateCurrentStep, markStepCompleted } = get();
    if (validateCurrentStep() && currentStep < 4) {
      markStepCompleted(currentStep);
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1 });
    }
  },

  updateFormData: (data: Partial<UniverseFormData>) => {
    set((state) => ({
      formData: { ...state.formData, ...data },
    }));
  },

  validateCurrentStep: () => {
    const { currentStep, formData } = get();
    const errors = get().getStepErrors(currentStep);
    return errors.length === 0;
  },

  getStepErrors: (step: number) => {
    const { formData } = get();
    const errors: string[] = [];

    switch (step) {
      case 1: // Introduction
        if (!formData.name.trim()) {
          errors.push('작품 이름을 입력해주세요');
        }
        if (formData.name.length > 100) {
          errors.push('작품 이름은 100자 이하로 입력해주세요');
        }
        if (!formData.description.trim()) {
          errors.push('작품 소개를 입력해주세요');
        }
        if (formData.description.length < 50) {
          errors.push('작품 소개는 최소 50자 이상 입력해주세요');
        }
        if (formData.description.length > 2000) {
          errors.push('작품 소개는 2000자 이하로 입력해주세요');
        }
        break;

      case 2: // Settings
        if (!formData.genre) {
          errors.push('장르를 선택해주세요');
        }
        if (!formData.worldSettings.trim()) {
          errors.push('작품 설정을 입력해주세요');
        }
        break;

      case 3: // Lorebook
        if (formData.lorebookEntries.length > 5) {
          errors.push('키워드북은 최대 5개까지 추가할 수 있습니다');
        }
        formData.lorebookEntries.forEach((entry, index) => {
          if (!entry.name.trim()) {
            errors.push(`${index + 1}번째 키워드북의 이름을 입력해주세요`);
          }
          if (!entry.content.trim()) {
            errors.push(`${index + 1}번째 키워드북의 정보를 입력해주세요`);
          }
        });
        break;

      case 4: // Registration
        if (!formData.preference) {
          errors.push('취향 설정을 선택해주세요');
        }
        const totalTags = formData.tags.length;
        const customTagsCount = formData.customTags?.length || 0;
        if (totalTags > 15) {
          errors.push('태그는 최대 15개까지 추가할 수 있습니다');
        }
        if (customTagsCount > 10) {
          errors.push('직접 입력 태그는 최대 10개까지 추가할 수 있습니다');
        }
        break;
    }

    return errors;
  },

  resetWizard: () => {
    set({
      currentStep: 1,
      completedSteps: new Set<number>(),
      formData: getEmptyUniverseFormData(),
      editingUniverseId: undefined,
    });
  },

  markStepCompleted: (step: number) => {
    set((state) => ({
      completedSteps: new Set(state.completedSteps).add(step),
    }));
  },

  // Lorebook management
  addLorebookEntry: (entry: LorebookEntry) => {
    set((state) => ({
      formData: {
        ...state.formData,
        lorebookEntries: [...state.formData.lorebookEntries, entry],
      },
    }));
  },

  updateLorebookEntry: (id: string, updates: Partial<LorebookEntry>) => {
    set((state) => ({
      formData: {
        ...state.formData,
        lorebookEntries: state.formData.lorebookEntries.map((entry) =>
          entry.id === id ? { ...entry, ...updates } : entry
        ),
      },
    }));
  },

  deleteLorebookEntry: (id: string) => {
    set((state) => ({
      formData: {
        ...state.formData,
        lorebookEntries: state.formData.lorebookEntries.filter((entry) => entry.id !== id),
      },
    }));
  },

  // Draft management
  saveDraft: (userId: string) => {
    const { formData } = get();
    console.log('💾 Saving draft with lorebook entries:', formData.lorebookEntries.length);
    return saveUniverseDraft(userId, formData);
  },

  loadDraft: (userId: string, draftId: string) => {
    const draftData = loadUniverseDraft(userId, draftId);
    if (draftData) {
      console.log('📥 Loading draft with lorebook entries:', draftData.lorebookEntries?.length || 0);
      set({ formData: draftData });
    }
  },

  loadUniverse: (universe: any) => {
    // Parse data JSON if it exists
    let dataJson: any = {};
    try {
      if (universe.dataJson) {
        dataJson = JSON.parse(universe.dataJson);
      }
    } catch (e) {
      console.error('Failed to parse universe dataJson:', e);
    }

    // Parse lorebook JSON
    let lorebookEntries: LorebookEntry[] = [];
    try {
      if (universe.lorebookJson) {
        const lorebookData = JSON.parse(universe.lorebookJson);
        lorebookEntries = (lorebookData.entries || []).map((entry: any) => ({
          id: entry.id || Math.random().toString(36).substr(2, 9),
          name: entry.name || '',
          content: entry.content || '',
          keywords: entry.keywords || [],
          isSecret: entry.isSecret || false,
        }));
      }
    } catch (e) {
      console.error('Failed to parse universe lorebookJson:', e);
    }

    set({
      formData: {
        name: universe.name || '',
        description: universe.description || '',
        visibility: universe.visibility || 'private',
        imageUrl: universe.imageUrl || '',
        genre: universe.genre || '',
        tags: universe.tags || [],
        customTags: [],
        worldSettings: dataJson.worldSettings || '',
        preference: dataJson.preference || '',
        lorebookEntries,
      },
      editingUniverseId: universe.id,
    });
  },
}));
