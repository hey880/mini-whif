'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { formatNumber } from '@/lib/utils';

interface UserNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  initialNote: string | null;
  onSaveSuccess: () => void;
}

const BASE_MAX_LENGTH = 500;
const EXTENDED_MAX_LENGTH = 1000;
const EXTENSION_GEM_COST = 5;

export function UserNoteModal({
  isOpen,
  onClose,
  roomId,
  initialNote,
  onSaveSuccess,
}: UserNoteModalProps) {
  const [note, setNote] = useState(initialNote || '');
  const [isExtended, setIsExtended] = useState((initialNote?.length || 0) > BASE_MAX_LENGTH);
  const [hasExtensionPaid, setHasExtensionPaid] = useState((initialNote?.length || 0) > BASE_MAX_LENGTH);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote || '');
      const isPaid = (initialNote?.length || 0) > BASE_MAX_LENGTH;
      setIsExtended(isPaid);
      setHasExtensionPaid(isPaid);
    }
  }, [isOpen, initialNote]);

  const maxLength = isExtended ? EXTENDED_MAX_LENGTH : BASE_MAX_LENGTH;
  const remaining = maxLength - note.length;

  const handleExtend = async () => {
    if (hasExtensionPaid) {
      // Just toggle the UI limit
      setIsExtended(!isExtended);
      return;
    }

    // Call API to extend
    setIsExtending(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${apiUrl}/chat-rooms/${roomId}/user-note/extend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 402) {
          toast.error('Gem이 부족합니다', {
            description: `필요: ${errorData.required} Gem, 보유: ${errorData.available} Gem`,
            action: {
              label: '충전하기',
              onClick: () => window.location.href = '/gem-shop',
            },
          });
          return;
        }
        throw new Error(errorData.error || 'Failed to extend');
      }

      const data = await response.json();

      if (data.alreadyExtended) {
        toast.info('이미 확장되어 있습니다');
      } else {
        toast.success(`1000자로 확장되었습니다 (${EXTENSION_GEM_COST} Gem 차감)`);
      }

      setHasExtensionPaid(true);
      setIsExtended(true);
    } catch (error) {
      console.error('Failed to extend:', error);
      toast.error('확장에 실패했습니다', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsExtending(false);
    }
  };

  const handleSave = async () => {
    if (note.length > maxLength) {
      toast.error('글자 수 제한을 초과했습니다');
      return;
    }

    setIsSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${apiUrl}/chat-rooms/${roomId}/user-note`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      toast.success('유저노트가 저장되었습니다');
      onSaveSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('저장에 실패했습니다', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

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
              edit_note
            </span>
            <div className="flex-1">
              <h2 className="text-headline-small font-bold">유저노트</h2>
              <p className="text-body-small text-on-surface-variant">
                AI에게 전달할 중요한 지시사항을 작성하세요
              </p>
            </div>
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
              <div className="flex-1">
                <p className="text-body-small text-on-primary-container">
                  유저노트는 AI에게 전달되어 대화에 반영됩니다. 캐릭터의 성격, 말투, 특정 행동 지시 등을 작성할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* Textarea */}
          <div className="space-y-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="예: 존댓말로 대화해줘, 밝고 활발한 성격으로 행동해줘..."
              className="w-full h-48 px-4 py-3 rounded-xl bg-surface-container-highest border border-outline focus:border-primary focus:outline-none resize-none custom-scrollbar text-body-large"
              maxLength={maxLength}
            />

            {/* Character Count */}
            <div className="flex items-center justify-between">
              <span className={`text-label-medium ${remaining < 0 ? 'text-error' : 'text-on-surface-variant'}`}>
                {note.length} / {formatNumber(maxLength)}
              </span>
              {remaining < 0 && (
                <span className="text-body-small text-error">
                  {Math.abs(remaining)}자 초과
                </span>
              )}
            </div>
          </div>

          {/* Extension Toggle */}
          <div className="border-t border-outline-variant pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-label-large text-on-surface">1000자 확장</span>
                  {hasExtensionPaid && (
                    <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-label-small">
                      결제완료
                    </span>
                  )}
                </div>
                <p className="text-body-small text-on-surface-variant mt-1">
                  {hasExtensionPaid
                    ? '500자와 1000자 중 선택할 수 있습니다'
                    : `${EXTENSION_GEM_COST} Gem으로 1000자까지 작성할 수 있습니다 (1회 결제)`
                  }
                </p>
              </div>

              {hasExtensionPaid ? (
                <button
                  onClick={() => setIsExtended(!isExtended)}
                  className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest transition-colors"
                >
                  <span className="text-label-medium font-medium">
                    {isExtended ? '500자로 변경' : '1000자로 변경'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleExtend}
                  disabled={isExtending}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isExtending ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      <span className="text-label-medium font-medium">확장 중...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-filled text-sm">diamond</span>
                      <span className="text-label-medium font-medium">{EXTENSION_GEM_COST} Gem으로 확장</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-surface-container border-t border-outline-variant px-6 py-4">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-outline hover:bg-surface-container-high transition-colors"
              disabled={isSaving}
            >
              <span className="text-label-large font-medium">취소</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || note.length > maxLength}
              className="flex-1 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  <span className="text-label-large font-medium">저장 중...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  <span className="text-label-large font-medium">저장하기</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
