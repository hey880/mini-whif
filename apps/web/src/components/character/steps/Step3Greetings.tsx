'use client';

import { useState } from 'react';
import { Plus, MessageSquare, X } from 'lucide-react';
import { useCharacterWizardStore } from '@/stores/characterWizardStore';
import { GreetingCard } from '../components/GreetingCard';
import type { Greeting } from '@/stores/characterWizardStore';

export function Step3Greetings() {
  const { formData, updateFormData } = useCharacterWizardStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGreeting, setEditingGreeting] = useState<Greeting | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);

  const openModal = (greeting?: Greeting) => {
    if (greeting) {
      setEditingGreeting(greeting);
      setFormTitle(greeting.title);
      setFormContent(greeting.content);
      setFormIsDefault(greeting.isDefault || false);
    } else {
      setEditingGreeting(null);
      setFormTitle('');
      setFormContent('');
      setFormIsDefault(formData.greetings.length === 0); // Auto-set as default if first
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingGreeting(null);
  };

  const handleSave = () => {
    if (!formTitle.trim() || !formContent.trim()) {
      return;
    }

    const greeting: Greeting = {
      id: editingGreeting?.id || crypto.randomUUID(),
      title: formTitle,
      content: formContent,
      isDefault: formIsDefault,
    };

    let updatedGreetings: Greeting[];

    if (editingGreeting) {
      updatedGreetings = formData.greetings.map((g) =>
        g.id === editingGreeting.id ? greeting : g,
      );
    } else {
      updatedGreetings = [...formData.greetings, greeting];
    }

    // If this is set as default, unset others
    if (formIsDefault) {
      updatedGreetings = updatedGreetings.map((g) =>
        g.id === greeting.id ? g : { ...g, isDefault: false },
      );
    }

    updateFormData({ greetings: updatedGreetings });
    closeModal();
  };

  const handleDelete = (id: string) => {
    const updatedGreetings = formData.greetings.filter((g) => g.id !== id);

    // If we deleted the default greeting, set first one as default
    const hasDefault = updatedGreetings.some((g) => g.isDefault);
    if (!hasDefault && updatedGreetings.length > 0) {
      updatedGreetings[0].isDefault = true;
    }

    updateFormData({ greetings: updatedGreetings });
  };

  const handleSetDefault = (id: string) => {
    updateFormData({
      greetings: formData.greetings.map((g) => ({
        ...g,
        isDefault: g.id === id,
      })),
    });
  };

  return (
    <div className="wizard-step space-y-6">
      <div>
        <h2 className="text-headline-medium mb-2">도입부</h2>
        <p className="text-body-medium text-on-surface-variant">
          캐릭터와 대화를 시작할 때 표시되는 시나리오를 작성하세요
        </p>
        <div className="mt-3 p-3 rounded-lg bg-tertiary-container/30 text-sm text-on-surface-variant">
          <p>
            💡 여러 개의 도입부를 만들 수 있으며, 유저가 선택할 수 있습니다.
            최소 1개는 필수입니다.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => openModal()}
          className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container hover:bg-primary/20 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          도입부 추가
        </button>
      </div>

      <div className="space-y-3">
        {formData.greetings.map((greeting) => (
          <GreetingCard
            key={greeting.id}
            greeting={greeting}
            onEdit={() => openModal(greeting)}
            onDelete={() => handleDelete(greeting.id)}
            onSetDefault={() => handleSetDefault(greeting.id)}
            canDelete={formData.greetings.length > 1}
          />
        ))}

        {formData.greetings.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">
            <MessageSquare className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-1">아직 도입부가 없습니다</p>
            <p className="text-xs">최소 1개의 도입부를 추가해주세요</p>
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
                  {editingGreeting ? '도입부 수정' : '도입부 추가'}
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
                  제목 <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="예: 일상적인 만남, 긴급 상황"
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                />
                <div className="text-xs text-on-surface-variant mt-1 text-right">
                  {formTitle.length}/100
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  내용 <span className="text-error">*</span>
                </label>
                <p className="text-xs text-on-surface-variant mb-2">
                  대화의 시작 상황과 캐릭터의 첫 대사를 작성하세요
                </p>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="예: 당신은 학교 도서관에서 캐릭터와 마주쳤습니다.&#10;&#10;캐릭터: &quot;안녕! 여기서 만날 줄은 몰랐네. 무슨 책 찾고 있어?&quot;"
                  rows={10}
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
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="w-5 h-5 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-on-surface">
                    기본 도입부로 설정
                  </span>
                </label>
                <p className="text-xs text-on-surface-variant mt-1 ml-8">
                  유저가 선택하지 않으면 이 도입부가 사용됩니다
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
                  disabled={!formTitle.trim() || !formContent.trim()}
                  className={`
                    flex-1 px-6 py-3 rounded-xl font-medium transition-colors
                    ${
                      formTitle.trim() && formContent.trim()
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
