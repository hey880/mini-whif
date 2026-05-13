'use client';

import { X, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface BookmarkedMessage {
  id: string;
  content: string;
  timestamp: string;
  role: 'user' | 'assistant';
}

interface BookmarkPanelProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarkedMessages: BookmarkedMessage[];
  onScrollToMessage: (messageId: string) => void;
  selectedMessageId: string | null;
  onSelectMessage: (messageId: string) => void;
}

export function BookmarkPanel({
  isOpen,
  onClose,
  bookmarkedMessages,
  onScrollToMessage,
  selectedMessageId,
  onSelectMessage,
}: BookmarkPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-surface glass-panel z-50 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
          <h2 className="text-title-large font-medium">북마크한 메시지</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {bookmarkedMessages.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant">
              <p className="text-sm">북마크한 메시지가 없습니다</p>
            </div>
          ) : (
            bookmarkedMessages.map((message) => (
              <div
                key={message.id}
                className={`glass-panel p-3 cursor-pointer transition-all ${
                  selectedMessageId === message.id
                    ? 'ring-2 ring-primary'
                    : 'hover:bg-surface-container/50'
                }`}
                onClick={() => onSelectMessage(message.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container text-xs">
                    {message.role === 'user' ? '사용자' : '캐릭터'}
                  </span>
                  <span className="text-label-small text-on-surface-variant">
                    {formatDate(message.timestamp)}
                  </span>
                </div>
                <p className="text-body-small line-clamp-3 mb-2">
                  {message.content}
                </p>

                {selectedMessageId === message.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onScrollToMessage(message.id);
                    }}
                    className="w-full mt-2 px-3 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    메시지로 이동하기
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
