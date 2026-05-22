'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

interface Greeting {
  id: string;
  title: string;
  content: string;
  isDefault: boolean;
}

interface GreetingSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  greetings: Greeting[];
  characterName: string;
  onSelect: (greetingId?: string) => void; // undefined = use default
}

export function GreetingSelectionModal({
  isOpen,
  onClose,
  greetings,
  characterName,
  onSelect,
}: GreetingSelectionModalProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen && greetings.length > 0) {
      setIsAnimating(true);
      // Select default greeting only when modal opens and greetings are available
      const defaultGreeting = greetings.find((g) => g.isDefault);
      setSelectedId(defaultGreeting?.id);
    } else if (!isOpen) {
      // Reset selection when modal closes
      setSelectedId(undefined);
    }
  }, [isOpen]); // Only trigger on modal open/close, not on greetings changes

  if (!isOpen) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 200);
  };

  const handleConfirm = () => {
    onSelect(selectedId);
    handleClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`glass-card p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto transition-all duration-200 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-title-large">도입부 선택</h3>
            <p className="text-body-medium text-on-surface-variant mt-1">
              <strong>{characterName}</strong>와의 대화를 어떻게 시작할까요?
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-surface-container rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {greetings.map((greeting) => (
            <button
              key={greeting.id}
              onClick={() => setSelectedId(greeting.id)}
              className={`w-full text-left glass-panel p-4 rounded-xl transition-all group ${
                selectedId === greeting.id
                  ? 'ring-2 ring-primary bg-primary-container/20'
                  : 'hover:bg-surface-container-high'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    selectedId === greeting.id
                      ? 'border-primary bg-primary'
                      : 'border-outline-variant'
                  }`}
                >
                  {selectedId === greeting.id && (
                    <CheckCircle2 className="w-4 h-4 text-on-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-title-medium">{greeting.title}</h4>
                    {greeting.isDefault && (
                      <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container text-label-small">
                        기본
                      </span>
                    )}
                  </div>
                  <p className="text-body-small text-on-surface-variant line-clamp-3 whitespace-pre-wrap">
                    {greeting.content}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3 pt-4 border-t border-outline-variant">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-6 py-3 rounded-xl glow-button"
          >
            이 도입부로 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
