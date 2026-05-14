'use client';

import { useState } from 'react';
import { Plus, BookOpen, X, Edit2, Trash2, Star, StarOff } from 'lucide-react';
import { useUniverseWizardStore } from '@/stores/universeWizardStore';
import type { LorebookEntry } from '@/lib/universeDraft';

export function Step3Lorebook() {
  const { formData, addLorebookEntry, updateLorebookEntry, deleteLorebookEntry, getStepErrors } =
    useUniverseWizardStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LorebookEntry | null>(null);
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formIsSecret, setFormIsSecret] = useState(false);
  const [triggerInput, setTriggerInput] = useState('');
  const [formKeywords, setFormKeywords] = useState<string[]>([]);
  const errors = getStepErrors(3);

  const openModal = (entry?: LorebookEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormName(entry.name);
      setFormContent(entry.content);
      setFormKeywords(entry.keywords);
      setFormIsSecret(entry.isSecret);
    } else {
      setEditingEntry(null);
      setFormName('');
      setFormContent('');
      setFormKeywords([]);
      setFormIsSecret(false);
    }
    setTriggerInput('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const handleSave = () => {
    if (!formName.trim() || !formContent.trim() || formKeywords.length === 0) {
      return;
    }

    const entry: LorebookEntry = {
      id: editingEntry?.id || Date.now().toString(),
      name: formName,
      content: formContent,
      keywords: formKeywords,
      isSecret: formIsSecret,
    };

    if (editingEntry) {
      updateLorebookEntry(editingEntry.id, entry);
    } else {
      addLorebookEntry(entry);
    }

    closeModal();
  };

  const addKeyword = () => {
    const keyword = triggerInput.trim();
    if (keyword && !formKeywords.includes(keyword)) {
      setFormKeywords([...formKeywords, keyword]);
      setTriggerInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormKeywords(formKeywords.filter((k) => k !== keyword));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById('lorebook-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formContent;
      const before = text.substring(0, start);
      const after = text.substring(end);
      setFormContent(before + placeholder + after);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-title-large font-bold text-on-surface mb-2">키워드북</h3>
        <p className="text-body-medium text-on-surface-variant mb-4">
          작품의 추가 정보를 저장해두는 기능입니다
        </p>

        {/* Info Box */}
        <div className="p-4 bg-tertiary-container/30 rounded-xl space-y-2 text-sm text-on-surface-variant">
          <p className="font-medium text-on-surface">💡 작품 키워드북이란?</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>작품의 추가 정보를 저장해두는 기능이에요.</li>
            <li>
              캐릭터나 유저가 특정 키워드를 말하면, 키워드북에 저장된 정보를 자동으로 불러와요.
            </li>
            <li className="text-xs pl-4">
              (키워드북은 우선순위에 따라 일정 개수만 포함됩니다. 키워드 호출 시 포함되어야하는
              중요한 키워드북은 꼭 별 아이콘을 눌러 중요 표시를 해주세요.)
            </li>
            <li>작품 키워드북은 작품 내의 모든 캐릭터에게 해당돼요.</li>
            <li>
              공개 키워드북은 트리거 키워드를 제외하고 제목과 내용이 공개됩니다.
            </li>
          </ul>
          <div className="pt-2 space-y-1">
            <p className="font-medium text-on-surface">📝 정보란?</p>
            <p className="pl-4">캐릭터가 불러올 추가 정보를 입력하시면 됩니다.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-on-surface">🔑 키워드란?</p>
            <p className="pl-4">
              추가 정보를 불러오는 트리거가 되는 키워드를 입력해주세요.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => openModal()}
          disabled={formData.lorebookEntries.length >= 5}
          className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container hover:bg-primary/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          키워드북 추가 ({formData.lorebookEntries.length}/5)
        </button>
      </div>

      <div className="space-y-3">
        {formData.lorebookEntries.map((entry) => (
          <div key={entry.id} className="glass-panel p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-on-surface truncate">{entry.name}</h4>
                  {entry.isSecret && (
                    <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-xs">
                      비공개
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {entry.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container text-xs"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openModal(entry)}
                  className="p-2 hover:bg-surface-container rounded-lg transition-colors"
                  title="수정"
                >
                  <Edit2 className="w-4 h-4 text-on-surface-variant" />
                </button>
                <button
                  onClick={() => deleteLorebookEntry(entry.id)}
                  className="p-2 hover:bg-error-container rounded-lg transition-colors"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4 text-error" />
                </button>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant line-clamp-2">{entry.content}</p>
          </div>
        ))}

        {formData.lorebookEntries.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">
            <BookOpen className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-1">아직 키워드북 항목이 없습니다</p>
            <p className="text-xs">선택사항입니다. 필요하지 않다면 건너뛰어도 됩니다</p>
          </div>
        )}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-md">
          <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-headline-small">
                  {editingEntry ? '키워드북 수정' : '키워드북 추가'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-surface-container rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  항목 이름 <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 센티널, 황궁, 길드 시스템"
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  트리거 키워드 <span className="text-error">*</span>
                </label>
                <p className="text-xs text-on-surface-variant mb-2">
                  대화에서 이 키워드가 언급되면 정보가 활성화됩니다
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={triggerInput}
                    onChange={(e) => setTriggerInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    placeholder="예: 센티널, 각성자, 폭주 (엔터로 추가)"
                    className="flex-1 px-4 py-2 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                  />
                  <button
                    onClick={addKeyword}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors"
                  >
                    추가
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-sm flex items-center gap-2"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-on-surface">
                    내용 <span className="text-error">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => insertPlaceholder('{{char}}')}
                      className="px-3 py-1 rounded-full text-xs bg-surface-container-high hover:bg-primary hover:text-on-primary transition-colors"
                    >
                      {'{{char}}'} 삽입
                    </button>
                    <button
                      onClick={() => insertPlaceholder('{{user}}')}
                      className="px-3 py-1 rounded-full text-xs bg-surface-container-high hover:bg-primary hover:text-on-primary transition-colors"
                    >
                      {'{{user}}'} 삽입
                    </button>
                  </div>
                </div>
                <textarea
                  id="lorebook-content"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="이 키워드에 대한 설명을 입력하세요"
                  rows={6}
                  maxLength={1000}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors resize-none"
                />
                <div className="text-xs text-on-surface-variant mt-1 text-right">
                  {formContent.length}/1000
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsSecret}
                    onChange={(e) => setFormIsSecret(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-outline checked:bg-primary checked:border-primary"
                  />
                  <span className="text-body-medium text-on-surface">
                    비공개 (사용자에게 보이지 않음)
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formName.trim() || !formContent.trim() || formKeywords.length === 0}
                  className={`
                    flex-1 px-6 py-3 rounded-xl font-medium transition-colors
                    ${
                      formName.trim() && formContent.trim() && formKeywords.length > 0
                        ? 'glow-button'
                        : 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                    }
                  `}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
