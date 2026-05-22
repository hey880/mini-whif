'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useCharacterWizardStore } from '@/stores/characterWizardStore';
import { WizardProgress } from './WizardProgress';
import { WizardNavigation } from './WizardNavigation';
import { Step1BasicSettings } from './steps/Step1BasicSettings';
import { Step2Lorebook } from './steps/Step2Lorebook';
import { Step3Greetings } from './steps/Step3Greetings';
import { Step4SituationalImages } from './steps/Step4SituationalImages';
import { Step5RelatedContent } from './steps/Step5RelatedContent';
import { Step6Registration } from './steps/Step6Registration';
import { characterClient } from '@/lib/connectrpc/client';
import type { Character } from '@persona-chat/proto/gen/ts/character_pb';

interface CharacterWizardProps {
  isOpen: boolean;
  onClose: () => void;
  editingCharacter?: Character | null;
  onSuccess?: () => void;
}

const OPTIONAL_STEPS = [2, 4, 5]; // Lorebook, Situational Images, Related Content

export function CharacterWizard({
  isOpen,
  onClose,
  editingCharacter,
  onSuccess,
}: CharacterWizardProps) {
  const {
    currentStep,
    completedSteps,
    formData,
    isEditMode,
    resetWizard,
    loadCharacter,
    nextStep,
    prevStep,
    setStep,
    validateCurrentStep,
    getStepErrors,
  } = useCharacterWizardStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load character data when editing
  useEffect(() => {
    if (isOpen && editingCharacter) {
      loadCharacter(editingCharacter);
      setHasUnsavedChanges(false);
    } else if (isOpen && !editingCharacter) {
      resetWizard();
      setHasUnsavedChanges(false);
    }
  }, [isOpen, editingCharacter, loadCharacter, resetWizard]);

  // Track unsaved changes
  useEffect(() => {
    if (isOpen) {
      setHasUnsavedChanges(true);
    }
  }, [formData, isOpen]);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        '저장하지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?',
      );
      if (!confirmed) return;
    }

    resetWizard();
    setSubmitError(null);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleSkip = () => {
    if (OPTIONAL_STEPS.includes(currentStep)) {
      nextStep();
    }
  };

  const handleNext = async () => {
    if (currentStep === 6) {
      await handleSubmit();
    } else {
      nextStep();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare data JSON
      const dataJson = JSON.stringify({
        gender: formData.gender || undefined,
        exampleDialogues:
          formData.exampleDialogues.length > 0
            ? formData.exampleDialogues
            : undefined,
        greetings: formData.greetings,
        situationalImages:
          formData.situationalImages.length > 0
            ? formData.situationalImages
            : undefined,
        relatedContent:
          formData.relatedContent.length > 0
            ? formData.relatedContent
            : undefined,
        authorComments: formData.authorComments || undefined,
        wizardVersion: 1,
        completedSteps: Array.from(completedSteps),
      });

      // Prepare lorebook JSON
      const lorebookJson = JSON.stringify({
        entries: formData.lorebookEntries,
      });

      // Get default greeting content for backward compatibility
      const defaultGreeting =
        formData.greetings.find((g) => g.isDefault) || formData.greetings[0];

      if (isEditMode && editingCharacter) {
        // Update existing character
        await characterClient.updateCharacter({
          id: editingCharacter.id,
          name: formData.name,
          tagline: formData.tagline,
          description: formData.description,
          aiPromptDescription: formData.aiPromptDescription || undefined,
          greeting: defaultGreeting?.content,
          imageUrl: formData.imageUrl || undefined,
          visibility: formData.visibility,
          isNsfw: formData.isNsfw,
          universeId: formData.noUniverse ? undefined : formData.universeId,
          keywords: formData.keywords,
          dataJson,
          lorebookJson,
        });
      } else {
        // Create new character
        await characterClient.createCharacter({
          name: formData.name,
          tagline: formData.tagline,
          description: formData.description,
          aiPromptDescription: formData.aiPromptDescription || undefined,
          greeting: defaultGreeting?.content,
          imageUrl: formData.imageUrl || undefined,
          visibility: formData.visibility,
          isNsfw: formData.isNsfw,
          universeId: formData.noUniverse ? undefined : formData.universeId,
          keywords: formData.keywords,
          dataJson,
          lorebookJson,
        });
      }

      // Success
      setHasUnsavedChanges(false);
      resetWizard();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to submit character:', error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : '캐릭터 등록에 실패했습니다. 다시 시도해주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const errors = getStepErrors(currentStep);
  const canProceed = validateCurrentStep();
  const isOptionalStep = OPTIONAL_STEPS.includes(currentStep);

  return (
    <div className="fixed inset-0 z-[100] bg-background lg:flex lg:items-center lg:justify-center lg:bg-background/80 lg:backdrop-blur-md">
      <div className="wizard-content h-full flex flex-col lg:glass-card lg:max-w-4xl lg:w-full lg:max-h-[90vh] lg:m-4">
        {/* Header */}
        <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-b border-outline-variant/30 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-large">
              {isEditMode ? '캐릭터 수정' : '새 캐릭터 만들기'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-surface-container rounded-lg transition-colors"
              title="닫기"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <WizardProgress
            currentStep={currentStep}
            totalSteps={6}
            completedSteps={completedSteps}
            onStepClick={setStep}
          />
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-container-padding pb-8">
          {currentStep === 1 && <Step1BasicSettings />}
          {currentStep === 2 && <Step2Lorebook />}
          {currentStep === 3 && <Step3Greetings />}
          {currentStep === 4 && <Step4SituationalImages />}
          {currentStep === 5 && <Step5RelatedContent />}
          {currentStep === 6 && <Step6Registration />}

          {/* Error Display */}
          {submitError && (
            <div className="mt-4">
              <div className="p-4 rounded-xl bg-error-container text-on-error-container">
                <p className="text-sm">{submitError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Navigation */}
        <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-t border-outline-variant/30 px-container-padding py-4">
          <WizardNavigation
            onBack={currentStep > 1 ? prevStep : undefined}
            onNext={handleNext}
            onSkip={isOptionalStep ? handleSkip : undefined}
            nextLabel={currentStep === 6 ? (isEditMode ? '캐릭터 업데이트' : '캐릭터 등록') : '다음'}
            canProceed={canProceed}
            errors={errors}
            isLoading={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
