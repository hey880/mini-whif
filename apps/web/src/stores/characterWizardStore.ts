import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface ExampleDialogue {
  id: string;
  situation: string;
  response: string;
}

export interface LorebookEntry {
  id: string;
  key: string;
  triggers: string[];
  content: string;
  priority?: number;
  enabled: boolean;
}

export interface Greeting {
  id: string;
  title: string;
  content: string;
  isDefault?: boolean;
}

export interface SituationalImage {
  id: string;
  imageUrl: string;
  triggers: string[];
  description?: string;
}

export interface RelatedContent {
  id: string;
  type: 'image' | 'video' | 'link';
  url: string;
  title?: string;
  description?: string;
}

export interface CharacterFormData {
  // Step 1
  name: string;
  gender: string;
  imageUrl: string;
  tagline: string;
  description: string;
  aiPromptDescription: string;
  exampleDialogues: ExampleDialogue[];
  universeId?: string;
  noUniverse: boolean;

  // Step 2
  lorebookEntries: LorebookEntry[];

  // Step 3
  greetings: Greeting[];

  // Step 4
  situationalImages: SituationalImage[];

  // Step 5
  relatedContent: RelatedContent[];

  // Step 6
  visibility: 'public' | 'private';
  isNsfw: boolean;
  keywords: string[];
  authorComments: string;
}

interface CharacterWizardState {
  // Wizard Control
  currentStep: number;
  completedSteps: Set<number>;
  isEditMode: boolean;
  editingCharacterId?: string;

  // Form Data
  formData: CharacterFormData;

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<CharacterFormData>) => void;
  markStepComplete: (step: number) => void;
  resetWizard: () => void;
  loadCharacter: (character: any) => void;

  // Validation
  validateCurrentStep: () => boolean;
  getStepErrors: (step: number) => string[];
}

const initialFormData: CharacterFormData = {
  name: '',
  gender: '',
  imageUrl: '',
  tagline: '',
  description: '',
  aiPromptDescription: '',
  exampleDialogues: [],
  universeId: undefined,
  noUniverse: false,
  lorebookEntries: [],
  greetings: [],
  situationalImages: [],
  relatedContent: [],
  visibility: 'public',
  isNsfw: false,
  keywords: [],
  authorComments: '',
};

export const useCharacterWizardStore = create<CharacterWizardState>((set, get) => ({
  currentStep: 1,
  completedSteps: new Set(),
  isEditMode: false,
  editingCharacterId: undefined,
  formData: initialFormData,

  setStep: (step: number) => {
    if (step >= 1 && step <= 6) {
      set({ currentStep: step });
    }
  },

  nextStep: () => {
    const { currentStep, validateCurrentStep, markStepComplete } = get();
    if (validateCurrentStep()) {
      markStepComplete(currentStep);
      if (currentStep < 6) {
        set({ currentStep: currentStep + 1 });
      }
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1 });
    }
  },

  updateFormData: (data: Partial<CharacterFormData>) => {
    set((state) => ({
      formData: { ...state.formData, ...data },
    }));
  },

  markStepComplete: (step: number) => {
    set((state) => ({
      completedSteps: new Set([...state.completedSteps, step]),
    }));
  },

  resetWizard: () => {
    set({
      currentStep: 1,
      completedSteps: new Set(),
      isEditMode: false,
      editingCharacterId: undefined,
      formData: initialFormData,
    });
  },

  loadCharacter: (character: any) => {
    console.log('🔄 loadCharacter 호출:', character);
    console.log('📦 dataJson (raw):', character.dataJson);
    console.log('📚 lorebookJson (raw):', character.lorebookJson);

    const data = character.dataJson ? JSON.parse(character.dataJson) : {};
    const lorebook = character.lorebookJson
      ? JSON.parse(character.lorebookJson)
      : { entries: [] };

    console.log('✨ Parsed data:', data);
    console.log('✨ Parsed lorebook:', lorebook);

    // Handle old characters with single greeting
    const greetings = data.greetings || [
      {
        id: uuidv4(),
        title: '기본 도입부',
        content: character.greeting || '',
        isDefault: true,
      },
    ];

    console.log('📝 exampleDialogues:', data.exampleDialogues);
    console.log('🎭 greetings:', greetings);
    console.log('🖼️ situationalImages:', data.situationalImages);
    console.log('🔗 relatedContent:', data.relatedContent);
    console.log('💬 authorComments:', data.authorComments);

    set({
      isEditMode: true,
      editingCharacterId: character.id,
      currentStep: 1,
      completedSteps: new Set(data.completedSteps || [1, 3, 6]),
      formData: {
        name: character.name || '',
        gender: data.gender || '',
        imageUrl: character.imageUrl || '',
        tagline: character.tagline || '',
        description: character.description || '',
        aiPromptDescription: character.aiPromptDescription || '',
        exampleDialogues: data.exampleDialogues || [],
        universeId: character.universeId || undefined,
        noUniverse: !character.universeId,
        lorebookEntries: lorebook.entries || [],
        greetings,
        situationalImages: data.situationalImages || [],
        relatedContent: data.relatedContent || [],
        visibility: character.visibility || 'public',
        isNsfw: character.isNsfw || false,
        keywords: character.keywords || [],
        authorComments: data.authorComments || '',
      },
    });
  },

  validateCurrentStep: () => {
    const { getStepErrors, currentStep } = get();
    const errors = getStepErrors(currentStep);
    return errors.length === 0;
  },

  getStepErrors: (step: number) => {
    const { formData } = get();
    const errors: string[] = [];

    switch (step) {
      case 1: // Basic Settings
        if (!formData.name.trim()) {
          errors.push('캐릭터 이름을 입력해주세요');
        }
        if (formData.name.length > 100) {
          errors.push('이름은 100자 이하로 입력해주세요');
        }
        if (!formData.tagline.trim()) {
          errors.push('소개를 입력해주세요');
        }
        if (formData.tagline.length > 200) {
          errors.push('소개는 200자 이하로 입력해주세요');
        }
        if (!formData.description.trim()) {
          errors.push('프롬프트를 입력해주세요');
        }
        if (formData.description.length < 50) {
          errors.push('프롬프트는 최소 50자 이상 작성해주세요');
        }
        if (formData.description.length > 2000) {
          errors.push('프롬프트는 2000자 이하로 작성해주세요');
        }
        break;

      case 2: // Lorebook (optional)
        // Validate entries if any exist
        formData.lorebookEntries.forEach((entry, idx) => {
          if (!entry.content.trim()) {
            errors.push(`키워드북 항목 ${idx + 1}: 내용을 입력해주세요`);
          }
          if (entry.triggers.length === 0) {
            errors.push(
              `키워드북 항목 ${idx + 1}: 최소 1개의 트리거를 추가해주세요`,
            );
          }
        });
        break;

      case 3: // Greetings (required)
        if (formData.greetings.length === 0) {
          errors.push('최소 1개의 도입부를 추가해주세요');
        }
        const hasDefault = formData.greetings.some((g) => g.isDefault);
        if (formData.greetings.length > 0 && !hasDefault) {
          errors.push('기본 도입부를 선택해주세요');
        }
        formData.greetings.forEach((greeting, idx) => {
          if (!greeting.title.trim()) {
            errors.push(`도입부 ${idx + 1}: 제목을 입력해주세요`);
          }
          if (!greeting.content.trim()) {
            errors.push(`도입부 ${idx + 1}: 내용을 입력해주세요`);
          }
        });
        break;

      case 4: // Situational Images (optional)
        formData.situationalImages.forEach((img, idx) => {
          if (!img.imageUrl.trim()) {
            errors.push(`이미지 ${idx + 1}: URL을 입력해주세요`);
          }
          if (img.triggers.length === 0) {
            errors.push(`이미지 ${idx + 1}: 최소 1개의 트리거를 추가해주세요`);
          }
        });
        break;

      case 5: // Related Content (optional)
        formData.relatedContent.forEach((content, idx) => {
          if (!content.url.trim()) {
            errors.push(`콘텐츠 ${idx + 1}: URL을 입력해주세요`);
          }
        });
        break;

      case 6: // Registration
        if (!formData.visibility) {
          errors.push('공개 여부를 선택해주세요');
        }
        if (formData.keywords.length === 0) {
          errors.push('최소 1개의 태그를 추가해주세요');
        }
        break;
    }

    return errors;
  },
}));
