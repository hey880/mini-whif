'use client';

import { formatDate, replacePlaceholders } from '@/lib/utils';
import { parseMessage } from '@/lib/messageParser';
import { Edit2, Trash2, Bookmark, BookmarkCheck, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  messageId: string;
  characterName?: string;
  characterImageUrl?: string;
  userName?: string;
  isBookmarked?: boolean;
  userReaction?: {
    reactionType: 'positive' | 'negative';
    createdAt: string;
  };
  triggeredImages?: Array<{
    id: string;
    imageUrl: string;
    description?: string;
  }>;
  onRegenerate?: () => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onBookmark?: (messageId: string) => void;
  onReaction?: (messageId: string, positive: boolean) => void;
  onCharacterAvatarClick?: () => void;
}

export function MessageBubble({
  role,
  content,
  timestamp,
  messageId,
  characterName,
  characterImageUrl,
  userName,
  isBookmarked = false,
  userReaction,
  triggeredImages,
  onRegenerate,
  onEdit,
  onDelete,
  onBookmark,
  onReaction,
  onCharacterAvatarClick,
}: MessageBubbleProps) {
  const isAI = role === 'assistant';

  // Replace placeholders in content
  const processedContent = replacePlaceholders(content, userName, characterName);

  return (
    <div className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isAI ? (
          <button
            onClick={onCharacterAvatarClick}
            className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer"
            title="캐릭터 상세 정보"
          >
            {characterImageUrl ? (
              <img
                src={characterImageUrl}
                alt={characterName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-primary">
                smart_toy
              </span>
            )}
          </button>
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-medium">
            U
          </div>
        )}
      </div>

      {/* Message content */}
      <div className={`flex-1 max-w-[70%] ${isAI ? '' : 'flex flex-col items-end'} group`}>
        {/* Header */}
        {isAI && characterName && (
          <div className="mb-1 text-label-medium text-on-surface-variant">
            {characterName}
          </div>
        )}

        {/* Bubble */}
        <div className={isAI ? 'ai-bubble' : 'user-bubble'}>
          <div className="text-body-medium whitespace-pre-wrap">
            {parseMessage(processedContent).map((segment, idx) => {
              if (segment.type === 'dialogue') {
                return (
                  <span key={idx} className="dialogue">
                    &quot;{segment.text}&quot;
                  </span>
                );
              } else if (segment.type === 'action') {
                return (
                  <em key={idx} className="action">
                    {segment.text}
                  </em>
                );
              } else {
                return <span key={idx}>{segment.text}</span>;
              }
            })}
          </div>
        </div>

        {/* Situational Images (AI messages only) */}
        {isAI && triggeredImages && triggeredImages.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2 max-w-md">
            {triggeredImages.map((img) => (
              <div
                key={img.id}
                className="relative aspect-square rounded-lg overflow-hidden glass-card"
              >
                <img
                  src={img.imageUrl}
                  alt={img.description || 'Situational image'}
                  className="w-full h-full object-cover"
                />
                {img.description && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-label-small text-white">
                      {img.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* User message actions (hover only) */}
        {!isAI && (
          <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit?.(messageId)}
              className="p-1.5 hover:bg-surface-container rounded-lg transition-colors"
              title="수정"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete?.(messageId)}
              className="p-1.5 hover:bg-error-container rounded-lg transition-colors text-error"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onBookmark?.(messageId)}
              className="p-1.5 hover:bg-surface-container rounded-lg transition-colors"
              title={isBookmarked ? '북마크 해제' : '북마크'}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-primary" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {/* AI message actions (always visible) */}
        {isAI && (
          <div className="mt-2 flex items-center gap-1 flex-wrap">
            <span className="text-label-small text-on-surface-variant mr-2">
              {formatDate(timestamp)}
            </span>

            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1.5 hover:bg-surface-container rounded-lg transition-colors"
                title="재생성"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {onEdit && (
              <button
                onClick={() => onEdit(messageId)}
                className="p-1.5 hover:bg-surface-container rounded-lg transition-colors"
                title="수정"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            {onReaction && (
              userReaction ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-container">
                  {userReaction.reactionType === 'positive' ? (
                    <ThumbsUp className="w-4 h-4 fill-primary text-primary" />
                  ) : (
                    <ThumbsDown className="w-4 h-4 fill-error text-error" />
                  )}
                  <span className="text-label-small text-on-surface-variant">
                    제출됨
                  </span>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onReaction(messageId, true)}
                    className="p-1.5 hover:bg-surface-container rounded-lg transition-colors hover:text-primary"
                    title="좋아요"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onReaction(messageId, false)}
                    className="p-1.5 hover:bg-surface-container rounded-lg transition-colors hover:text-error"
                    title="싫어요"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </>
              )
            )}

            <button
              onClick={() => onBookmark?.(messageId)}
              className="p-1.5 hover:bg-surface-container rounded-lg transition-colors"
              title={isBookmarked ? '북마크 해제' : '북마크'}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-primary" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => onDelete?.(messageId)}
              className="p-1.5 hover:bg-error-container rounded-lg transition-colors text-error"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* User message timestamp (always visible) */}
        {!isAI && (
          <div className="mt-1 text-label-small text-on-surface-variant">
            {formatDate(timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}
