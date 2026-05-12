'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface ContinueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (hint?: string) => void;
  gemCost: number;
}

export function ContinueModal({
  isOpen,
  onClose,
  onContinue,
  gemCost,
}: ContinueModalProps) {
  const [hint, setHint] = useState('');

  if (!isOpen) return null;

  const handleContinue = () => {
    onContinue(hint.trim() || undefined);
    setHint('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl mb-0 bg-surface rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/30">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-headline-medium font-medium mb-1">
                자동진행
              </h2>
              <p className="text-body-medium text-on-surface-variant">
                유저 메시지를 보내지 않고, 캐릭터에게 한번 더 답변을 받는 기능입니다
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-surface-container rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Gem cost info */}
          <div className="glass-panel p-4 border border-primary/20">
            <div className="flex items-center gap-2 text-body-medium">
              <span className="material-symbols-filled text-primary">diamond</span>
              <span>
                일반 메시지 입력과 동일한{' '}
                <span className="text-primary font-semibold">{gemCost} Gem</span>이
                차감됩니다
              </span>
            </div>
          </div>

          {/* Hint input */}
          <div>
            <label className="block text-title-small font-medium mb-2">
              힌트 (선택사항)
            </label>
            <p className="text-body-small text-on-surface-variant mb-3">
              캐릭터의 다음 행동이나 대사에 대한 힌트를 제공할 수 있습니다.
              예: "기뻐하며", "무언가를 떠올리고", "미소를 지으며" 등
            </p>
            <textarea
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="예: 웃으면서 다가오고..."
              className="w-full min-h-[120px] px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none resize-none"
            />
            <p className="mt-2 text-label-small text-on-surface-variant">
              💡 힌트를 비워두면 캐릭터가 자유롭게 행동합니다
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-outline-variant/30 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-medium"
          >
            취소
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 px-6 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            바로 사용
          </button>
        </div>
      </div>
    </div>
  );
}
