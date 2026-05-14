'use client';

import { useUniverseWizardStore } from '@/stores/universeWizardStore';
import { UNIVERSE_TAG_CATEGORIES, PREFERENCE_OPTIONS, MAX_TOTAL_TAGS, MAX_CUSTOM_TAGS } from '@/constants/universeTags';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function Step4Registration() {
  const { formData, updateFormData, getStepErrors } = useUniverseWizardStore();
  const [customTagInput, setCustomTagInput] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('genre-mood');
  const errors = getStepErrors(4);

  const customTags = formData.customTags || [];
  const totalTags = formData.tags.length;
  const canAddMoreTags = totalTags < MAX_TOTAL_TAGS;
  const canAddMoreCustomTags = customTags.length < MAX_CUSTOM_TAGS;

  const toggleTag = (tag: string, isCustom: boolean = false) => {
    if (formData.tags.includes(tag)) {
      // Remove tag
      updateFormData({
        tags: formData.tags.filter((t) => t !== tag),
        customTags: isCustom ? customTags.filter((t) => t !== tag) : customTags,
      });
    } else {
      // Add tag if under limit
      if (canAddMoreTags) {
        updateFormData({
          tags: [...formData.tags, tag],
          customTags: isCustom ? [...customTags, tag] : customTags,
        });
      } else {
        alert(`태그는 최대 ${MAX_TOTAL_TAGS}개까지 추가할 수 있습니다`);
      }
    }
  };

  const addCustomTag = () => {
    const tag = customTagInput.trim();
    if (!tag) return;

    if (formData.tags.includes(tag)) {
      alert('이미 추가된 태그입니다');
      return;
    }

    if (!canAddMoreTags) {
      alert(`태그는 최대 ${MAX_TOTAL_TAGS}개까지 추가할 수 있습니다`);
      return;
    }

    if (!canAddMoreCustomTags) {
      alert(`직접 입력 태그는 최대 ${MAX_CUSTOM_TAGS}개까지 추가할 수 있습니다`);
      return;
    }

    updateFormData({
      tags: [...formData.tags, tag],
      customTags: [...customTags, tag],
    });
    setCustomTagInput('');
  };

  const handleCustomTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTag();
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-title-large font-bold text-on-surface mb-2">등록</h3>
        <p className="text-body-medium text-on-surface-variant">
          작품의 공개 설정과 취향, 태그를 지정해주세요
        </p>
      </div>

      {/* Visibility - Smaller buttons */}
      <div>
        <label className="block text-label-large font-medium text-on-surface mb-3">
          공개 설정 <span className="text-error">*</span>
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => updateFormData({ visibility: 'public' })}
            className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
              formData.visibility === 'public'
                ? 'border-primary bg-primary-container text-on-primary-container'
                : 'border-outline bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-xl">
                {formData.visibility === 'public' ? 'radio_button_checked' : 'radio_button_unchecked'}
              </span>
              <span className="font-medium">공개</span>
            </div>
          </button>

          <button
            onClick={() => updateFormData({ visibility: 'private' })}
            className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
              formData.visibility === 'private'
                ? 'border-primary bg-primary-container text-on-primary-container'
                : 'border-outline bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-xl">
                {formData.visibility === 'private' ? 'radio_button_checked' : 'radio_button_unchecked'}
              </span>
              <span className="font-medium">비공개</span>
            </div>
          </button>
        </div>
      </div>

      {/* Preference */}
      <div>
        <label className="block text-label-large font-medium text-on-surface mb-3">
          취향 설정 <span className="text-error">*</span>
        </label>
        <div className="space-y-2">
          {PREFERENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateFormData({ preference: option.value })}
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all text-left ${
                formData.preference === option.value
                  ? 'border-primary bg-primary-container text-on-primary-container'
                  : 'border-outline bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">
                  {formData.preference === option.value ? 'radio_button_checked' : 'radio_button_unchecked'}
                </span>
                <span className="font-medium">{option.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tags with Accordion */}
      <div>
        <label className="block text-label-large font-medium text-on-surface mb-2">
          태그 ({totalTags}/{MAX_TOTAL_TAGS})
        </label>
        <p className="text-label-small text-on-surface-variant mb-3">
          직접 입력 태그는 최대 {MAX_CUSTOM_TAGS}개까지 가능합니다
        </p>

        {/* Selected Tags Display */}
        {formData.tags.length > 0 && (
          <div className="mb-4 p-3 bg-surface-container-high rounded-xl">
            <p className="text-label-small text-on-surface-variant mb-2">선택된 태그:</p>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag, customTags.includes(tag))}
                  className="px-3 py-1 rounded-full bg-primary text-on-primary text-sm flex items-center gap-1 hover:bg-primary/80 transition-colors"
                >
                  {tag}
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tag Categories Accordion */}
        <div className="space-y-2">
          {UNIVERSE_TAG_CATEGORIES.map((category) => (
            <div key={category.id} className="border border-outline-variant rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full px-4 py-3 bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-between"
              >
                <span className="font-medium text-on-surface">{category.label}</span>
                {expandedCategory === category.id ? (
                  <ChevronUp className="w-5 h-5 text-on-surface-variant" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-on-surface-variant" />
                )}
              </button>

              {expandedCategory === category.id && (
                <div className="p-4 bg-surface-container-low">
                  <div className="flex flex-wrap gap-2">
                    {category.tags.map((tag) => {
                      const isSelected = formData.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          disabled={!isSelected && !canAddMoreTags}
                          className={`px-3 py-1 rounded-full text-sm transition-all ${
                            isSelected
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container-highest text-on-surface hover:bg-surface-container-high border border-outline'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Custom Input Accordion */}
          <div className="border border-outline-variant rounded-xl overflow-hidden">
            <button
              onClick={() => toggleCategory('custom')}
              className="w-full px-4 py-3 bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-between"
            >
              <span className="font-medium text-on-surface">
                직접 입력 ({customTags.length}/{MAX_CUSTOM_TAGS})
              </span>
              {expandedCategory === 'custom' ? (
                <ChevronUp className="w-5 h-5 text-on-surface-variant" />
              ) : (
                <ChevronDown className="w-5 h-5 text-on-surface-variant" />
              )}
            </button>

            {expandedCategory === 'custom' && (
              <div className="p-4 bg-surface-container-low space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={handleCustomTagKeyDown}
                    placeholder="태그 입력 후 엔터 또는 추가 버튼"
                    disabled={!canAddMoreTags || !canAddMoreCustomTags}
                    className="flex-1 input-glow disabled:opacity-50"
                  />
                  <button
                    onClick={addCustomTag}
                    disabled={!canAddMoreTags || !canAddMoreCustomTags}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    추가
                  </button>
                </div>

                {customTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {customTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag, true)}
                        className="px-3 py-1 rounded-full bg-tertiary text-on-tertiary text-sm flex items-center gap-1 hover:bg-tertiary/80 transition-colors"
                      >
                        {tag}
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="p-6 bg-surface-container-high rounded-2xl space-y-4">
        <h4 className="text-title-medium font-bold text-on-surface">작품 정보 확인</h4>
        <div className="space-y-2 text-body-medium">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">작품 이름:</span>
            <span className="text-on-surface font-medium">{formData.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">장르:</span>
            <span className="text-on-surface font-medium">{formData.genre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">공개 설정:</span>
            <span className="text-on-surface font-medium">
              {formData.visibility === 'public' ? '공개' : '비공개'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">취향 설정:</span>
            <span className="text-on-surface font-medium">
              {formData.preference === 'bl' ? 'BL (남X남)' : formData.preference === 'hl' ? 'HL (남X여)' : '미설정'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">키워드북:</span>
            <span className="text-on-surface font-medium">
              {formData.lorebookEntries.length}개
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">태그:</span>
            <span className="text-on-surface font-medium">{formData.tags.length}개</span>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="p-4 bg-error-container rounded-xl">
        <p className="text-body-small text-on-error-container">
          ⚠️ <strong>콘텐츠 가이드라인</strong>
          <br />
          작품이 다음 내용을 포함하지 않는지 확인해주세요:
          <br />• 폭력적이거나 혐오적인 표현
          <br />• 미성년자 관련 부적절한 내용
          <br />• 타인의 저작권을 침해하는 내용
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-4 bg-error-container rounded-xl">
          <ul className="list-disc list-inside text-label-medium text-on-error-container">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
