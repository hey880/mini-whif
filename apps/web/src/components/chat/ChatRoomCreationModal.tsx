'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Copy, Plus } from 'lucide-react';

interface ChatRoomCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterId: string;
  characterName: string;
  hasExistingRoom: boolean;
  onOptionSelected: (option: 'continue' | 'new' | 'clone') => void;
}

export function ChatRoomCreationModal({
  isOpen,
  onClose,
  characterName,
  hasExistingRoom,
  onOptionSelected,
}: ChatRoomCreationModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 200);
  };

  const handleOptionClick = (option: 'continue' | 'new' | 'clone') => {
    onOptionSelected(option);
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
        className={`glass-card p-6 max-w-md w-full transition-all duration-200 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-title-large mb-2">대화 시작하기</h3>
        <p className="text-body-medium text-on-surface-variant mb-6">
          <strong>{characterName}</strong>와 어떻게 대화를 시작하시겠습니까?
        </p>

        <div className="space-y-3">
          {hasExistingRoom && (
            <>
              <button
                onClick={() => handleOptionClick('continue')}
                className="w-full glass-panel p-4 rounded-xl hover:bg-primary-container transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-title-medium mb-1">기존 대화 이어하기</h4>
                    <p className="text-body-small text-on-surface-variant">
                      가장 최근 대화방으로 이동합니다
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleOptionClick('clone')}
                className="w-full glass-panel p-4 rounded-xl hover:bg-secondary-container transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center flex-shrink-0 group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                    <Copy className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-title-medium mb-1">기존 대화 복사해서 이어하기</h4>
                    <p className="text-body-small text-on-surface-variant">
                      대화 내용을 복사해서 새 채팅방을 만듭니다
                    </p>
                  </div>
                </div>
              </button>
            </>
          )}

          <button
            onClick={() => handleOptionClick('new')}
            className="w-full glass-panel p-4 rounded-xl hover:bg-tertiary-container transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-tertiary-container flex items-center justify-center flex-shrink-0 group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-title-medium mb-1">새로운 대화 하기</h4>
                <p className="text-body-small text-on-surface-variant">
                  처음부터 새로운 대화를 시작합니다
                </p>
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={handleClose}
          className="w-full mt-6 px-6 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
}
