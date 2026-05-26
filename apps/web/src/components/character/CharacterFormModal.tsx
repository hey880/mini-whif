'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface CharacterFormData {
  name: string;
  tagline: string;
  description: string;
  aiPromptDescription: string;
  greeting: string;
  imageUrl: string;
  visibility: 'public' | 'private';
  isNsfw: boolean;
  keywords: string[];
}

interface CharacterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CharacterFormData) => void;
  initialData?: Partial<CharacterFormData>;
  isLoading?: boolean;
}

export function CharacterFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}: CharacterFormModalProps) {
  const [formData, setFormData] = useState<CharacterFormData>({
    name: '',
    tagline: '',
    description: '',
    aiPromptDescription: '',
    greeting: '',
    imageUrl: '',
    visibility: 'public',
    isNsfw: false,
    keywords: [],
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof CharacterFormData, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        tagline: initialData.tagline || '',
        description: initialData.description || '',
        aiPromptDescription: initialData.aiPromptDescription || '',
        greeting: initialData.greeting || '',
        imageUrl: initialData.imageUrl || '',
        visibility: initialData.visibility || 'public',
        isNsfw: initialData.isNsfw || false,
        keywords: initialData.keywords || [],
      });
    } else {
      setFormData({
        name: '',
        tagline: '',
        description: '',
        aiPromptDescription: '',
        greeting: '',
        imageUrl: '',
        visibility: 'public',
        isNsfw: false,
        keywords: [],
      });
    }
    setErrors({});
    setKeywordInput('');
  }, [initialData, isOpen]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CharacterFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }

    if (!formData.tagline.trim()) {
      newErrors.tagline = 'Tagline is required';
    } else if (formData.tagline.length > 200) {
      newErrors.tagline = 'Tagline must be 200 characters or less';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'UI Description is required';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'UI Description must be 2000 characters or less';
    }

    if (formData.aiPromptDescription && formData.aiPromptDescription.length > 5000) {
      newErrors.aiPromptDescription = 'AI Prompt Description must be 5000 characters or less';
    }

    if (!formData.greeting.trim()) {
      newErrors.greeting = 'First message is required';
    } else if (formData.greeting.length > 1000) {
      newErrors.greeting = 'First message must be 1000 characters or less';
    }

    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      newErrors.imageUrl = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleAddKeyword = () => {
    const keyword = keywordInput.trim();
    if (keyword && !formData.keywords.includes(keyword)) {
      setFormData({ ...formData, keywords: [...formData.keywords, keyword] });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((k) => k !== keyword),
    });
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative glass-card p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-headline-large font-headline">
            {initialData ? '캐릭터 수정' : '새 캐릭터 만들기'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
            disabled={isLoading}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-label-large font-medium mb-2">
                  Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input-glow w-full"
                  placeholder="Character name"
                  maxLength={100}
                  disabled={isLoading}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.name && (
                    <span className="text-label-small text-error">
                      {errors.name}
                    </span>
                  )}
                  <span className="text-label-small text-on-surface-variant ml-auto">
                    {formData.name.length}/100
                  </span>
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-label-large font-medium mb-2">
                  Tagline <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) =>
                    setFormData({ ...formData, tagline: e.target.value })
                  }
                  className="input-glow w-full"
                  placeholder="A brief description of the character"
                  maxLength={200}
                  disabled={isLoading}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.tagline && (
                    <span className="text-label-small text-error">
                      {errors.tagline}
                    </span>
                  )}
                  <span className="text-label-small text-on-surface-variant ml-auto">
                    {formData.tagline.length}/200
                  </span>
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-label-large font-medium mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, imageUrl: e.target.value })
                  }
                  className="input-glow w-full"
                  placeholder="https://example.com/image.jpg"
                  disabled={isLoading}
                />
                {errors.imageUrl && (
                  <span className="text-label-small text-error">
                    {errors.imageUrl}
                  </span>
                )}

                {/* Image Preview */}
                {formData.imageUrl && isValidUrl(formData.imageUrl) && (
                  <div className="mt-3 glass-panel p-3 rounded-lg">
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden">
                      <Image
                        src={formData.imageUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-label-large font-medium mb-2">
                  Visibility
                </label>
                <select
                  value={formData.visibility}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      visibility: e.target.value as CharacterFormData['visibility'],
                    })
                  }
                  className="input-glow w-full"
                  disabled={isLoading}
                >
                  <option value="public">Public - Anyone can find and use</option>
                  <option value="private">Private - Only you</option>
                </select>
              </div>

              {/* NSFW Toggle */}
              <div className="flex items-center gap-3 glass-panel p-4 rounded-lg">
                <input
                  type="checkbox"
                  id="isNsfw"
                  checked={formData.isNsfw}
                  onChange={(e) =>
                    setFormData({ ...formData, isNsfw: e.target.checked })
                  }
                  className="w-5 h-5 rounded accent-primary"
                  disabled={isLoading}
                />
                <label htmlFor="isNsfw" className="text-body-medium flex-1">
                  NSFW Content
                </label>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* UI Description (2000자) */}
              <div>
                <label className="block text-label-large font-medium mb-2">
                  UI Description <span className="text-error">*</span>
                  <span className="text-label-small text-on-surface-variant ml-2">
                    (캐릭터 상세페이지에 표시)
                  </span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="input-glow w-full min-h-[120px] resize-y"
                  placeholder="Character description shown on detail page (2000 chars max)"
                  maxLength={2000}
                  disabled={isLoading}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.description && (
                    <span className="text-label-small text-error">
                      {errors.description}
                    </span>
                  )}
                  <span className="text-label-small text-on-surface-variant ml-auto">
                    {formData.description.length}/2000
                  </span>
                </div>
              </div>

              {/* AI Prompt Description (5000자) */}
              <div>
                <label className="block text-label-large font-medium mb-2">
                  AI Prompt Description
                  <span className="text-label-small text-on-surface-variant ml-2">
                    (AI 프롬프트용 상세 설명)
                  </span>
                </label>
                <textarea
                  value={formData.aiPromptDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, aiPromptDescription: e.target.value })
                  }
                  className="input-glow w-full min-h-[180px] resize-y"
                  placeholder="Detailed character info for AI (personality, background, speaking style, etc. - 5000 chars max)"
                  maxLength={5000}
                  disabled={isLoading}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.aiPromptDescription && (
                    <span className="text-label-small text-error">
                      {errors.aiPromptDescription}
                    </span>
                  )}
                  <span className="text-label-small text-on-surface-variant ml-auto">
                    {formData.aiPromptDescription.length}/5000
                  </span>
                </div>
              </div>

              {/* Greeting */}
              <div>
                <label className="block text-label-large font-medium mb-2">
                  First Message <span className="text-error">*</span>
                </label>
                <textarea
                  value={formData.greeting}
                  onChange={(e) =>
                    setFormData({ ...formData, greeting: e.target.value })
                  }
                  className="input-glow w-full min-h-[100px] resize-y"
                  placeholder="The character's opening message..."
                  maxLength={1000}
                  disabled={isLoading}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.greeting && (
                    <span className="text-label-small text-error">
                      {errors.greeting}
                    </span>
                  )}
                  <span className="text-label-small text-on-surface-variant ml-auto">
                    {formData.greeting.length}/1000
                  </span>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-label-large font-medium mb-2">
                  Keywords
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    className="input-glow flex-1"
                    placeholder="Add keyword and press Enter"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors"
                    disabled={isLoading}
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>

                {/* Keywords List */}
                {formData.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.keywords.map((keyword) => (
                      <div
                        key={keyword}
                        className="tag-chip tag-chip-active flex items-center gap-1"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(keyword)}
                          className="ml-1 hover:text-error transition-colors"
                          disabled={isLoading}
                        >
                          <span className="material-symbols-outlined text-sm">
                            close
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-label-large font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 glow-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin">
                    progress_activity
                  </span>
                  Saving...
                </span>
              ) : initialData ? (
                'Update Character'
              ) : (
                'Create Character'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
