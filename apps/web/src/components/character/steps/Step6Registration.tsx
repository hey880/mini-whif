'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useCharacterWizardStore } from '@/stores/characterWizardStore';

export function Step6Registration() {
  const { formData, updateFormData } = useCharacterWizardStore();
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.keywords.includes(tag)) {
      updateFormData({
        keywords: [...formData.keywords, tag],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    updateFormData({
      keywords: formData.keywords.filter((k) => k !== tag),
    });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="wizard-step space-y-6">
      <div>
        <h2 className="text-headline-medium mb-2">등록 설정</h2>
        <p className="text-body-medium text-on-surface-variant">
          캐릭터를 검토하고 최종 설정을 완료하세요
        </p>
      </div>

      {/* Character Preview */}
      <div className="glass-card p-6">
        <h3 className="text-headline-small mb-4">캐릭터 미리보기</h3>

        <div className="flex gap-4 mb-6">
          {formData.imageUrl && (
            <img
              src={formData.imageUrl}
              alt={formData.name}
              className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-title-large mb-1">{formData.name || '이름 없음'}</h4>
            <p className="text-body-medium text-on-surface-variant line-clamp-2">
              {formData.tagline || '소개 없음'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 text-center">
            <div className="text-headline-medium text-primary mb-1">
              {formData.greetings.length}
            </div>
            <div className="text-label-small text-on-surface-variant">
              도입부
            </div>
          </div>
          <div className="glass-panel p-4 text-center">
            <div className="text-headline-medium text-secondary mb-1">
              {formData.lorebookEntries.length}
            </div>
            <div className="text-label-small text-on-surface-variant">
              키워드북
            </div>
          </div>
          <div className="glass-panel p-4 text-center">
            <div className="text-headline-medium text-tertiary mb-1">
              {formData.situationalImages.length}
            </div>
            <div className="text-label-small text-on-surface-variant">
              상황 이미지
            </div>
          </div>
          <div className="glass-panel p-4 text-center">
            <div className="text-headline-medium text-primary mb-1">
              {formData.relatedContent.length}
            </div>
            <div className="text-label-small text-on-surface-variant">
              관련 콘텐츠
            </div>
          </div>
        </div>

        {formData.description && (
          <div className="mt-4 p-4 rounded-lg bg-surface-container">
            <h5 className="text-sm font-medium mb-2">AI 프롬프트</h5>
            <p className="text-sm text-on-surface-variant line-clamp-4">
              {formData.description}
            </p>
          </div>
        )}
      </div>

      {/* Content Rating */}
      <div>
        <label className="block text-sm font-medium text-on-surface mb-3">
          콘텐츠 등급 <span className="text-error">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`
              p-4 rounded-xl border-2 cursor-pointer transition-all
              ${
                !formData.isNsfw
                  ? 'border-primary bg-primary-container/30'
                  : 'border-outline-variant/30 hover:border-outline-variant'
              }
            `}
          >
            <input
              type="radio"
              name="nsfw"
              checked={!formData.isNsfw}
              onChange={() => updateFormData({ isNsfw: false })}
              className="sr-only"
            />
            <div className="text-center">
              <div className="text-lg font-medium mb-1">Safe</div>
              <div className="text-xs text-on-surface-variant">
                전체 이용가 콘텐츠
              </div>
            </div>
          </label>
          <label
            className={`
              p-4 rounded-xl border-2 cursor-pointer transition-all
              ${
                formData.isNsfw
                  ? 'border-error bg-error-container/30'
                  : 'border-outline-variant/30 hover:border-outline-variant'
              }
            `}
          >
            <input
              type="radio"
              name="nsfw"
              checked={formData.isNsfw}
              onChange={() => updateFormData({ isNsfw: true })}
              className="sr-only"
            />
            <div className="text-center">
              <div className="text-lg font-medium mb-1">Unsafe (NSFW)</div>
              <div className="text-xs text-on-surface-variant">
                성인 콘텐츠 포함
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium text-on-surface mb-3">
          공개 여부 <span className="text-error">*</span>
        </label>
        <div className="space-y-2">
          {[
            {
              value: 'public' as const,
              label: '공개',
              description: '모든 사용자가 검색하고 사용할 수 있습니다',
            },
            {
              value: 'private' as const,
              label: '비공개',
              description: '본인만 사용할 수 있습니다',
            },
          ].map((option) => (
            <label
              key={option.value}
              className={`
                flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                ${
                  formData.visibility === option.value
                    ? 'border-primary bg-primary-container/30'
                    : 'border-outline-variant/30 hover:border-outline-variant'
                }
              `}
            >
              <input
                type="radio"
                name="visibility"
                value={option.value}
                checked={formData.visibility === option.value}
                onChange={(e) =>
                  updateFormData({
                    visibility: e.target.value as 'public' | 'private',
                  })
                }
                className="w-5 h-5 text-primary focus:ring-primary mt-0.5"
              />
              <div>
                <div className="font-medium mb-1">{option.label}</div>
                <div className="text-sm text-on-surface-variant">
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-on-surface mb-2">
          태그 <span className="text-error">*</span>
        </label>
        <p className="text-xs text-on-surface-variant mb-2">
          캐릭터를 분류할 태그를 추가하세요 (최소 1개)
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="태그 입력 후 엔터 (예: 판타지, 현대, 로맨스)"
            className="flex-1 px-4 py-2 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
          />
          <button
            onClick={addTag}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors"
          >
            추가
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.keywords.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1.5 rounded-full bg-primary-container text-on-primary-container text-sm flex items-center gap-2"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        {formData.keywords.length === 0 && (
          <p className="text-xs text-error mt-2">최소 1개의 태그를 추가해주세요</p>
        )}
      </div>

      {/* Author Comments */}
      <div>
        <label className="block text-sm font-medium text-on-surface mb-2">
          작가 코멘트 (선택사항)
        </label>
        <textarea
          value={formData.authorComments}
          onChange={(e) => updateFormData({ authorComments: e.target.value })}
          placeholder="캐릭터에 대한 작가의 코멘트를 남겨주세요..."
          rows={4}
          maxLength={500}
          className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors resize-none"
        />
        <div className="text-xs text-on-surface-variant mt-1 text-right">
          {formData.authorComments.length}/500
        </div>
      </div>

      <div className="p-4 rounded-lg bg-tertiary-container/30 text-sm text-on-surface-variant">
        <p>
          ✅ 모든 설정이 완료되었습니다. &quot;캐릭터 등록&quot; 버튼을 눌러
          캐릭터를 생성하세요.
        </p>
      </div>
    </div>
  );
}
