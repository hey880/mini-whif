'use client';

import { Check } from 'lucide-react';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
  onStepClick?: (step: number) => void;
  stepLabels?: string[];
}

const defaultStepLabels = [
  '기본설정',
  '키워드북',
  '도입부',
  '상황별 이미지',
  '관련 콘텐츠',
  '등록',
];

export function WizardProgress({
  currentStep,
  totalSteps,
  completedSteps,
  onStepClick,
  stepLabels = defaultStepLabels,
}: WizardProgressProps) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center justify-between min-w-max px-4 gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map(
          (step, index) => {
            const isCompleted = completedSteps.has(step);
            const isCurrent = step === currentStep;
            const isFuture = step > currentStep && !isCompleted;
            const isClickable = onStepClick && (isCompleted || step <= currentStep);

            return (
              <div key={step} className="flex items-center">
                <button
                  onClick={() => isClickable && onStepClick(step)}
                  disabled={!isClickable}
                  className="flex flex-col items-center gap-2 disabled:cursor-default"
                >
                  <div
                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm
                    transition-all duration-200
                    ${
                      isCompleted
                        ? 'bg-primary text-on-primary'
                        : isCurrent
                          ? 'ring-2 ring-primary bg-primary-container text-on-primary-container'
                          : 'bg-surface-container text-on-surface-variant'
                    }
                    ${isClickable ? 'hover:ring-2 hover:ring-primary cursor-pointer' : ''}
                  `}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : step}
                  </div>
                  <span
                    className={`
                    text-xs font-medium whitespace-nowrap
                    ${isCurrent ? 'text-primary' : 'text-on-surface-variant'}
                  `}
                  >
                    {stepLabels[index]}
                  </span>
                </button>

                {index < totalSteps - 1 && (
                  <div
                    className={`
                    w-8 h-0.5 mx-2 mb-6 transition-colors duration-200
                    ${isCompleted ? 'bg-primary' : 'bg-outline-variant'}
                  `}
                  />
                )}
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}
