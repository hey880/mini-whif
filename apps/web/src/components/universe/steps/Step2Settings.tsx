'use client';

import { useUniverseWizardStore } from '@/stores/universeWizardStore';
import { GENRE_DEFAULTS, GENRE_OPTIONS } from '@/constants/genres';
import { useEffect, useState } from 'react';

export function Step2Settings() {
  const { formData, updateFormData, getStepErrors } = useUniverseWizardStore();
  const [hasLoadedDefault, setHasLoadedDefault] = useState(false);
  const errors = getStepErrors(2);

  // Auto-fill default settings when genre is selected
  useEffect(() => {
    if (formData.genre && !formData.worldSettings && !hasLoadedDefault) {
      const defaultSetting = GENRE_DEFAULTS[formData.genre];
      if (defaultSetting) {
        updateFormData({ worldSettings: defaultSetting });
        setHasLoadedDefault(true);
      }
    }
  }, [formData.genre, formData.worldSettings, hasLoadedDefault, updateFormData]);

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById('world-settings') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.worldSettings;
      const before = text.substring(0, start);
      const after = text.substring(end);
      updateFormData({ worldSettings: before + placeholder + after });

      // Set cursor position after the inserted placeholder
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-title-large font-bold text-on-surface mb-2">작품 설정</h3>
        <p className="text-body-medium text-on-surface-variant">
          작품의 세계관과 특수 설정을 입력해주세요
        </p>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-primary-container rounded-xl">
        <p className="text-body-medium text-on-primary-container">
          <span className="font-bold">{'{{user}}'}</span>이라고 입력하면 사용자의 닉네임이
          반영되어 나타납니다.
        </p>
      </div>

      {/* Genre Selection */}
      <div>
        <label className="block text-label-large font-medium text-on-surface mb-2">
          장르 설정 <span className="text-error">*</span>
        </label>
        <select
          value={formData.genre}
          onChange={(e) => updateFormData({ genre: e.target.value })}
          className="w-full input-glow"
        >
          <option value="">장르를 선택하세요</option>
          {GENRE_OPTIONS.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
        <p className="text-label-small text-on-surface-variant mt-1">
          장르를 선택하면 기본 설정이 자동으로 입력됩니다
        </p>
      </div>

      {/* World Settings */}
      <div>
        <label className="block text-label-large font-medium text-on-surface mb-2">
          작품 설정 <span className="text-error">*</span>
        </label>
        <p className="text-body-small text-on-surface-variant mb-2">
          AI가 이해할 수 있도록 작성해주세요 (유저 비공개)
        </p>
        <textarea
          id="world-settings"
          value={formData.worldSettings}
          onChange={(e) => updateFormData({ worldSettings: e.target.value })}
          placeholder={`예시:\n- 세계관의 핵심 규칙\n- 시대적 배경\n- 특수한 능력 체계\n- 사회 구조\n- 주요 세력\n\n${
            formData.genre ? `장르 "${formData.genre}"에 대한 기본 설정이 자동으로 입력됩니다.` : ''
          }`}
          rows={12}
          className="w-full input-glow resize-none font-mono"
        />
        <div className="flex items-center justify-between mt-1">
          <p className="text-label-small text-on-surface-variant">
            {formData.worldSettings.length}자
          </p>
          <button
            onClick={() => insertPlaceholder('{{user}}')}
            className="px-4 py-2 rounded-full bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface text-sm font-medium transition-all"
          >
            {'{{user}}'} 삽입
          </button>
        </div>
      </div>

      {/* Warning */}
      <div className="p-4 bg-tertiary-container rounded-xl">
        <p className="text-body-small text-on-tertiary-container">
          💡 <strong>작품에 대한 특이 설정을 꼭 명시해주세요.</strong>
          <br />
          예: 오메가버스의 페로몬 작동 방식, 가이드버스의 센티널 폭주 조건, 헌터물의 랭크 체계
          등
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
