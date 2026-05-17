'use client';

import { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

interface RerollConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (hint?: string) => void;
  gemCost: number;
}

export function RerollConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  gemCost,
}: RerollConfirmModalProps) {
  const [hint, setHint] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const trimmedHint = hint.trim();
    onConfirm(trimmedHint || undefined);
    onClose();
    setHint(''); // Reset hint after confirm
  };

  const handleClose = () => {
    onClose();
    setHint(''); // Reset hint on close
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-surface rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-title-large font-medium">메시지 재생성</h2>
              <p className="text-body-small text-on-surface-variant">
                AI 응답을 다시 생성합니다
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-surface-container rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-surface-container-high rounded-xl p-6 text-center">
            <p className="text-label-medium text-on-surface-variant mb-2">
              재생성 비용
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl">
                diamond
              </span>
              <p className="text-headline-large font-bold text-primary">
                {gemCost}
              </p>
              <p className="text-title-medium text-on-surface-variant">
                Gem
              </p>
            </div>
          </div>

          {/* Hint Input */}
          <div>
            <label htmlFor="hint" className="block text-label-medium font-medium mb-2">
              힌트 (선택사항)
            </label>
            <textarea
              id="hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="예시: {{char}}가 {{user}}를 밀친다"
              className="w-full px-4 py-3 rounded-lg bg-surface-container-high border border-outline-variant/30 focus:border-primary focus:outline-none resize-none text-body-medium"
              rows={3}
            />
            <p className="text-label-small text-on-surface-variant mt-1">
              AI가 이 힌트를 참고하여 응답을 생성합니다
            </p>
          </div>

          <div className="bg-primary/5 rounded-lg p-4">
            <p className="text-body-small text-on-surface-variant text-center">
              💡 이전 메시지는 버전 기록에 저장되며,<br />
              언제든지 다른 버전으로 전환할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-surface-container-low flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 rounded-full border border-outline hover:bg-surface-container transition-colors text-label-large font-medium"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-6 py-3 rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors text-label-large font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            재생성하기
          </button>
        </div>
      </div>
    </div>
  );
}
