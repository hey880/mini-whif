'use client';

import { useEffect, useState } from 'react';
import { X, Save, FolderOpen } from 'lucide-react';
import { useUniverseWizardStore } from '@/stores/universeWizardStore';
import { useAuthStore } from '@/stores/authStore';
import { useMutation } from '@tanstack/react-query';
import { universeClient } from '@/lib/connectrpc/client';
import { getUniverseDrafts, deleteUniverseDraft, type UniverseDraft } from '@/lib/universeDraft';
import { WizardProgress } from '../character/WizardProgress';
import { WizardNavigation } from '../character/WizardNavigation';
import { Step1Introduction } from './steps/Step1Introduction';
import { Step2Settings } from './steps/Step2Settings';
import { Step3Lorebook } from './steps/Step3Lorebook';
import { Step4Registration } from './steps/Step4Registration';
import type { Universe } from '../../../../../packages/proto/gen/ts/universe_pb';

interface UniverseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingUniverse?: Universe | null;
}

const OPTIONAL_STEPS = [3]; // Lorebook

export function UniverseWizard({ isOpen, onClose, onSuccess, editingUniverse }: UniverseWizardProps) {
  const { user } = useAuthStore();
  const {
    currentStep,
    completedSteps,
    formData,
    validateCurrentStep,
    nextStep,
    prevStep,
    setStep,
    resetWizard,
    loadDraft,
    saveDraft,
    getStepErrors,
    loadUniverse,
  } = useUniverseWizardStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);

  // Load editing universe on mount
  useEffect(() => {
    if (isOpen && editingUniverse) {
      loadUniverse(editingUniverse);
    } else if (isOpen && !editingUniverse) {
      resetWizard();
    }
  }, [isOpen, editingUniverse, loadUniverse, resetWizard]);

  // Check for draft on mount (only when not editing)
  useEffect(() => {
    if (isOpen && user?.id && !editingUniverse) {
      const drafts = getUniverseDrafts(user.id);
      if (drafts.length > 0) {
        const latestDraft = drafts[0];
        const savedDate = new Date(latestDraft.savedAt).toLocaleString('ko-KR');
        const confirmed = confirm(
          `${savedDate}에 저장된 작품이 있습니다. 불러오시겠습니까?`
        );
        if (confirmed) {
          loadDraft(user.id, latestDraft.id);
          setCurrentDraftId(latestDraft.id);
          setLastSaved(new Date(latestDraft.savedAt).toLocaleTimeString('ko-KR'));
        }
      }
    }
  }, [isOpen, user?.id, loadDraft, editingUniverse]);

  // Track unsaved changes (skip initial render)
  useEffect(() => {
    if (isOpen && formData.name) {
      setHasUnsavedChanges(true);
    }
  }, [formData, isOpen]);

  // Manual save function
  const handleManualSave = () => {
    if (user?.id && formData.name) {
      console.log('💾 Manual save triggered');
      const draftId = saveDraft(user.id);
      setCurrentDraftId(draftId);
      setLastSaved(new Date().toLocaleTimeString('ko-KR'));
      setHasUnsavedChanges(false);
    }
  };

  // Load draft from modal
  const handleLoadDraft = (draft: UniverseDraft) => {
    loadDraft(user!.id, draft.id);
    setCurrentDraftId(draft.id);
    setLastSaved(new Date(draft.savedAt).toLocaleTimeString('ko-KR'));
    setIsDraftsModalOpen(false);
    setHasUnsavedChanges(false);
  };

  // Delete draft from modal
  const handleDeleteDraft = (draftId: string) => {
    if (user?.id) {
      const confirmed = window.confirm('이 임시저장을 삭제하시겠습니까?');
      if (confirmed) {
        deleteUniverseDraft(user.id, draftId);
        // Refresh modal if needed
        setIsDraftsModalOpen(false);
        setTimeout(() => setIsDraftsModalOpen(true), 0);
      }
    }
  };

  // Get drafts list
  const drafts = user?.id ? getUniverseDrafts(user.id) : [];

  // Auto-save on form data change
  useEffect(() => {
    if (isOpen && user?.id && formData.name) {
      console.log('⏱️  Auto-save scheduled (2s delay)');
      const timer = setTimeout(() => {
        console.log('💾 Auto-saving now...');
        const draftId = saveDraft(user.id);
        setCurrentDraftId(draftId);
        setLastSaved(new Date().toLocaleTimeString('ko-KR'));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [formData, user?.id, saveDraft, isOpen]);

  // Save immediately on step change
  useEffect(() => {
    if (isOpen && user?.id && formData.name && currentStep > 1) {
      console.log('📝 Step changed - saving immediately');
      const draftId = saveDraft(user.id);
      setCurrentDraftId(draftId);
      setLastSaved(new Date().toLocaleTimeString('ko-KR'));
    }
  }, [currentStep, user?.id, saveDraft, isOpen, formData.name]);

  // Create universe mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('로그인이 필요합니다. 다시 로그인해주세요.');
      }

      const lorebookJson = JSON.stringify({
        entries: formData.lorebookEntries.map((entry) => ({
          name: entry.name,
          content: entry.content,
          keywords: entry.keywords,
          isSecret: entry.isSecret,
        })),
      });

      const dataJson = JSON.stringify({
        worldSettings: formData.worldSettings,
        preference: formData.preference,
      });

      return await universeClient.createUniverse({
        name: formData.name,
        description: formData.description,
        visibility: formData.visibility,
        imageUrl: formData.imageUrl || undefined,
        genre: formData.genre,
        tags: formData.tags,
        lorebookJson,
        dataJson,
      });
    },
    onSuccess: () => {
      // Delete the draft from LocalStorage after successful creation
      if (user?.id && currentDraftId) {
        deleteUniverseDraft(user.id, currentDraftId);
      }
      setHasUnsavedChanges(false);
      setCurrentDraftId(null);
      setLastSaved(null);
      resetWizard();
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to create universe:', error);
      const errorMessage = error?.message || '작품 등록에 실패했습니다. 다시 시도해주세요.';
      setSubmitError(errorMessage);
    },
  });

  // Update universe mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !editingUniverse) {
        throw new Error('필수 정보가 없습니다.');
      }

      const lorebookJson = JSON.stringify({
        entries: formData.lorebookEntries.map((entry) => ({
          name: entry.name,
          content: entry.content,
          keywords: entry.keywords,
          isSecret: entry.isSecret,
        })),
      });

      const dataJson = JSON.stringify({
        worldSettings: formData.worldSettings,
        preference: formData.preference,
      });

      return await universeClient.updateUniverse({
        id: editingUniverse.id,
        name: formData.name,
        description: formData.description,
        visibility: formData.visibility,
        imageUrl: formData.imageUrl || undefined,
        genre: formData.genre,
        tags: formData.tags,
        lorebookJson,
        dataJson,
      });
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      resetWizard();
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to update universe:', error);
      const errorMessage = error?.message || '작품 수정에 실패했습니다. 다시 시도해주세요.';
      setSubmitError(errorMessage);
    },
  });

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        '저장하지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?'
      );
      if (!confirmed) return;
    }

    resetWizard();
    setSubmitError(null);
    setHasUnsavedChanges(false);
    setLastSaved(null);
    setCurrentDraftId(null);
    onClose();
  };

  const handleSkip = () => {
    if (OPTIONAL_STEPS.includes(currentStep)) {
      nextStep();
    }
  };

  const handleNext = async () => {
    if (currentStep === 4) {
      await handleSubmit();
    } else {
      nextStep();
    }
  };

  const handleSubmit = async () => {
    // Check authentication before submitting
    if (!user?.id) {
      setSubmitError('로그인이 필요합니다. 로그인 후 다시 시도해주세요.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (editingUniverse) {
        await updateMutation.mutateAsync();
      } else {
        await createMutation.mutateAsync();
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      // Error is handled by mutation's onError
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
            <div>
              <h2 className="text-headline-large">작품 만들기</h2>
              {lastSaved && (
                <p className="text-label-small text-on-surface-variant mt-1">
                  마지막 저장: {lastSaved}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Drafts button */}
              <button
                onClick={() => setIsDraftsModalOpen(true)}
                className="p-2 hover:bg-surface-container rounded-lg transition-colors relative"
                title="임시저장 목록"
              >
                <FolderOpen className="w-5 h-5" />
                {drafts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-on-primary text-xs rounded-full flex items-center justify-center">
                    {drafts.length}
                  </span>
                )}
              </button>
              {/* Manual save button */}
              <button
                onClick={handleManualSave}
                disabled={!formData.name}
                className="p-2 hover:bg-surface-container rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="수동 저장"
              >
                <Save className="w-5 h-5" />
              </button>
              {/* Close button */}
              <button
                onClick={handleClose}
                className="p-2 hover:bg-surface-container rounded-lg transition-colors"
                title="닫기"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <WizardProgress
            currentStep={currentStep}
            totalSteps={4}
            completedSteps={completedSteps}
            onStepClick={setStep}
            stepLabels={['작품 소개', '작품 설정', '키워드북', '등록']}
          />
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-container-padding pb-8">
          {currentStep === 1 && <Step1Introduction />}
          {currentStep === 2 && <Step2Settings />}
          {currentStep === 3 && <Step3Lorebook />}
          {currentStep === 4 && <Step4Registration />}

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
            nextLabel={currentStep === 4 ? '작품 등록' : '다음'}
            canProceed={canProceed}
            errors={errors}
            isLoading={isSubmitting}
          />
        </div>
      </div>

      {/* Drafts Modal */}
      {isDraftsModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-background/80 backdrop-blur-md">
          <div className="glass-card max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-headline-small">임시저장 목록</h3>
                <button
                  onClick={() => setIsDraftsModalOpen(false)}
                  className="p-2 hover:bg-surface-container rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {drafts.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">
                  <FolderOpen className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">저장된 임시 작품이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="glass-panel p-4 hover:bg-surface-container-high transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Thumbnail */}
                        {draft.thumbnailUrl ? (
                          <img
                            src={draft.thumbnailUrl}
                            alt={draft.formData.name}
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                            <span className="text-on-surface-variant text-xs">이미지 없음</span>
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-on-surface truncate mb-1">
                            {draft.formData.name || '(제목 없음)'}
                          </h4>
                          <p className="text-xs text-on-surface-variant mb-2">
                            {new Date(draft.savedAt).toLocaleString('ko-KR')}
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs text-on-surface-variant">
                            {draft.formData.genre && (
                              <span className="px-2 py-0.5 rounded-full bg-surface-container">
                                장르: {draft.formData.genre}
                              </span>
                            )}
                            {draft.formData.lorebookEntries?.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-surface-container">
                                키워드북: {draft.formData.lorebookEntries.length}개
                              </span>
                            )}
                            {draft.formData.tags?.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-surface-container">
                                태그: {draft.formData.tags.length}개
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleLoadDraft(draft)}
                            className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors text-sm font-medium"
                          >
                            불러오기
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="px-4 py-2 rounded-lg bg-error-container text-on-error-container hover:bg-error/20 transition-colors text-sm"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
