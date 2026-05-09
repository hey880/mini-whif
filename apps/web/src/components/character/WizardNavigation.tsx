'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';

interface WizardNavigationProps {
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  canProceed: boolean;
  errors?: string[];
  isLoading?: boolean;
}

export function WizardNavigation({
  onBack,
  onNext,
  onSkip,
  nextLabel = '다음',
  canProceed,
  errors = [],
  isLoading = false,
}: WizardNavigationProps) {
  return (
    <div className="border-t border-outline-variant/30 pt-6">
      {errors.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-error-container text-on-error-container">
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, idx) => (
              <li key={idx} className="text-sm">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={!onBack}
          className={`
            px-6 py-3 rounded-xl font-medium transition-all
            flex items-center gap-2
            ${
              onBack
                ? 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                : 'opacity-0 pointer-events-none'
            }
          `}
        >
          <ArrowLeft className="w-4 h-4" />
          이전
        </button>

        <div className="flex items-center gap-3">
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-4 py-2 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              건너뛰기
            </button>
          )}

          <button
            onClick={onNext}
            disabled={!canProceed || isLoading}
            className={`
              px-6 py-3 rounded-xl font-medium transition-all
              flex items-center gap-2
              ${
                canProceed && !isLoading
                  ? 'glow-button'
                  : 'bg-surface-container text-on-surface-variant cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                처리중...
              </>
            ) : (
              <>
                {nextLabel}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
