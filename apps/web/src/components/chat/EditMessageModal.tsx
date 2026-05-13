'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface EditMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  onSave: (content: string) => void;
  role: 'user' | 'assistant';
}

export function EditMessageModal({
  isOpen,
  onClose,
  initialContent,
  onSave,
  role,
}: EditMessageModalProps) {
  const [content, setContent] = useState(initialContent);

  if (!isOpen) return null;

  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl mb-0 bg-surface rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/30 flex items-center justify-between">
          <div>
            <h2 className="text-headline-medium font-medium">메시지 수정</h2>
            <p className="text-body-small text-on-surface-variant mt-1">
              {role === 'user' ? '사용자' : '캐릭터'} 메시지를 수정합니다
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="w-full min-h-[200px] px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none resize-none"
            autoFocus
          />

          {/* Format helpers */}
          <div className="mt-4 text-body-small text-on-surface-variant space-y-1">
            <p>💡 포맷 가이드:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><code>&quot;대사&quot;</code> - 큰따옴표로 대사를 감싸세요</li>
              <li><code>*행동*</code> - 별표로 행동을 감싸세요</li>
            </ul>
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
            onClick={handleSave}
            disabled={!content.trim()}
            className="flex-1 px-6 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
