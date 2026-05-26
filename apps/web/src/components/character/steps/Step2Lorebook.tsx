'use client';

import { useState } from 'react';
import { Plus, BookOpen, X } from 'lucide-react';
import { useCharacterWizardStore } from '@/stores/characterWizardStore';
import { LorebookEntry as LorebookEntryCard } from '../components/LorebookEntry';
import type { LorebookEntry } from '@/stores/characterWizardStore';
import { v4 as uuidv4 } from 'uuid';

export function Step2Lorebook() {
  const { formData, updateFormData } = useCharacterWizardStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LorebookEntry | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPriority, setFormPriority] = useState(5);
  const [triggerInput, setTriggerInput] = useState('');
  const [formTriggers, setFormTriggers] = useState<string[]>([]);

  const openModal = (entry?: LorebookEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormKey(entry.key);
      setFormContent(entry.content);
      setFormPriority(entry.priority || 5);
      setFormTriggers(entry.triggers);
    } else {
      setEditingEntry(null);
      setFormKey('');
      setFormContent('');
      setFormPriority(5);
      setFormTriggers([]);
    }
    setTriggerInput('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const handleSave = () => {
    if (!formKey.trim() || !formContent.trim() || formTriggers.length === 0) {
      return;
    }

    const entry: LorebookEntry = {
      id: editingEntry?.id || uuidv4(),
      key: formKey,
      content: formContent,
      triggers: formTriggers,
      priority: formPriority,
      enabled: editingEntry?.enabled ?? true,
    };

    if (editingEntry) {
      updateFormData({
        lorebookEntries: formData.lorebookEntries.map((e) =>
          e.id === editingEntry.id ? entry : e,
        ),
      });
    } else {
      updateFormData({
        lorebookEntries: [...formData.lorebookEntries, entry],
      });
    }

    closeModal();
  };

  const handleDelete = (id: string) => {
    updateFormData({
      lorebookEntries: formData.lorebookEntries.filter((e) => e.id !== id),
    });
  };

  const handleToggle = (id: string) => {
    updateFormData({
      lorebookEntries: formData.lorebookEntries.map((e) =>
        e.id === id ? { ...e, enabled: !e.enabled } : e,
      ),
    });
  };

  const addTrigger = () => {
    const trigger = triggerInput.trim();
    if (trigger && !formTriggers.includes(trigger)) {
      setFormTriggers([...formTriggers, trigger]);
      setTriggerInput('');
    }
  };

  const removeTrigger = (trigger: string) => {
    setFormTriggers(formTriggers.filter((t) => t !== trigger));
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTrigger();
    }
  };

  return (
    <div className="wizard-step space-y-6">
      <div>
        <h2 className="text-headline-medium mb-2">키워드북</h2>
        <p className="text-body-medium text-on-surface-variant">
          특정 키워드가 입력되면 자동으로 로드되는 추가 정보를 설정하세요
        </p>
        <div className="mt-3 p-3 rounded-lg bg-tertiary-container/30 text-sm text-on-surface-variant">
          <p>
            💡 캐릭터나 유저가 특정 단어를 말하면 해당 정보가 AI에게 자동으로
            전달됩니다
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => openModal()}
          className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container hover:bg-primary/20 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          키워드북 추가
        </button>
      </div>

      <div className="space-y-3">
        {formData.lorebookEntries.map((entry) => (
          <LorebookEntryCard
            key={entry.id}
            entry={entry}
            onEdit={() => openModal(entry)}
            onDelete={() => handleDelete(entry.id)}
            onToggle={() => handleToggle(entry.id)}
          />
        ))}

        {formData.lorebookEntries.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">
            <BookOpen className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-1">아직 키워드북 항목이 없습니다</p>
            <p className="text-xs">
              선택사항입니다. 필요하지 않다면 건너뛰어도 됩니다
            </p>
          </div>
        )}
      </div>

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
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder="예: 캐릭터의 과거"
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  트리거 키워드 <span className="text-error">*</span>
                </label>
                <p className="text-xs text-on-surface-variant mb-2">
                  이 키워드들이 입력되면 정보가 활성화됩니다
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={triggerInput}
                    onChange={(e) => setTriggerInput(e.target.value)}
                    onKeyDown={handleTriggerKeyDown}
                    placeholder="키워드 입력 후 엔터"
                    className="flex-1 px-4 py-2 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                  />
                  <button
                    onClick={addTrigger}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors"
                  >
                    추가
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formTriggers.map((trigger) => (
                    <span
                      key={trigger}
                      className="px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-sm flex items-center gap-2"
                    >
                      {trigger}
                      <button
                        onClick={() => removeTrigger(trigger)}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  내용 <span className="text-error">*</span>
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="이 키워드가 트리거되면 AI에게 전달할 정보를 입력하세요..."
                  rows={6}
                  maxLength={1000}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors resize-none"
                />
                <div className="text-xs text-on-surface-variant mt-1 text-right">
                  {formContent.length}/1000
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  우선순위
                </label>
                <input
                  type="number"
                  value={formPriority}
                  onChange={(e) => setFormPriority(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                />
                <p className="text-xs text-on-surface-variant mt-1">
                  1-10 사이 값 (높을수록 먼저 적용됨, 기본값: 5)
                </p>
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
                  disabled={
                    !formKey.trim() ||
                    !formContent.trim() ||
                    formTriggers.length === 0
                  }
                  className={`
                    flex-1 px-6 py-3 rounded-xl font-medium transition-colors
                    ${
                      formKey.trim() &&
                      formContent.trim() &&
                      formTriggers.length > 0
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
