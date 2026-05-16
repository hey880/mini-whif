'use client';

import { formatNumber } from '@/lib/utils';

interface MemoryStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
  currentSummary: string | null;
  messageCount: number;
  isGenerating: boolean;
  gemCost: number;
}

export function MemoryStorageModal({
  isOpen,
  onClose,
  onGenerate,
  currentSummary,
  messageCount,
  isGenerating,
  gemCost,
}: MemoryStorageModalProps) {
  if (!isOpen) return null;

  const canGenerate = messageCount >= 40;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-surface-container rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="sticky top-0 bg-surface-container border-b border-outline-variant px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">
              psychology
            </span>
            <h2 className="text-headline-small font-bold flex-1">기억저장소</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-primary-container rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-primary mt-0.5">
                info
              </span>
              <div className="flex-1 space-y-1">
                <p className="text-body-medium text-on-primary-container">
                  기억저장소는 대화 내용을 AI가 요약하여 저장합니다. 이후 대화에서 AI가 이전 맥락을 기억할 수 있습니다.
                </p>
                <p className="text-body-small text-on-primary-container/70">
                  40개 이상의 메시지가 필요하며, 한 번 생성할 때마다 {gemCost} Gem이 소모됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* Message Count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-label-large text-on-surface-variant">현재 메시지 수</span>
              <span className={`text-title-medium font-medium ${canGenerate ? 'text-primary' : 'text-error'}`}>
                {messageCount} / 40
              </span>
            </div>
            {!canGenerate && (
              <p className="text-body-small text-error">
                최소 40개의 메시지가 필요합니다. (부족: {40 - messageCount}개)
              </p>
            )}
          </div>

          {/* Gem Cost */}
          <div className="flex items-center justify-between p-4 bg-surface-container-high rounded-xl">
            <span className="text-label-large text-on-surface-variant">소모 Gem</span>
            <div className="flex items-center gap-2">
              <span className="material-symbols-filled text-primary">diamond</span>
              <span className="text-title-medium font-medium">{formatNumber(gemCost)}</span>
            </div>
          </div>

          {/* Current Summary */}
          {currentSummary && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant">
                  description
                </span>
                <span className="text-label-large text-on-surface-variant">현재 저장된 요약</span>
              </div>
              <div className="bg-surface-container-highest rounded-xl p-4">
                <p className="text-body-medium text-on-surface whitespace-pre-wrap">
                  {currentSummary}
                </p>
              </div>
              <p className="text-body-small text-on-surface-variant">
                새로운 요약을 생성하면 기존 내용이 대체됩니다.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-surface-container border-t border-outline-variant px-6 py-4">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-outline hover:bg-surface-container-high transition-colors"
              disabled={isGenerating}
            >
              <span className="text-label-large font-medium">취소</span>
            </button>
            <button
              onClick={onGenerate}
              disabled={!canGenerate || isGenerating}
              className="flex-1 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  <span className="text-label-large font-medium">생성 중...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">psychology</span>
                  <span className="text-label-large font-medium">생성하기</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
