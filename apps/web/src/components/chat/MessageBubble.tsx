'use client';

import { formatDate } from '@/lib/utils';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  characterName?: string;
  characterImageUrl?: string;
  onRegenerate?: () => void;
  onViewVersions?: () => void;
  onReaction?: (positive: boolean) => void;
}

export function MessageBubble({
  role,
  content,
  timestamp,
  characterName,
  characterImageUrl,
  onRegenerate,
  onViewVersions,
  onReaction,
}: MessageBubbleProps) {
  const isAI = role === 'assistant';

  return (
    <div className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isAI ? (
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden">
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
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-medium">
            U
          </div>
        )}
      </div>

      {/* Message content */}
      <div className={`flex-1 max-w-[70%] ${isAI ? '' : 'flex flex-col items-end'}`}>
        {/* Header */}
        {isAI && characterName && (
          <div className="mb-1 text-label-medium text-on-surface-variant">
            {characterName}
          </div>
        )}

        {/* Bubble */}
        <div className={isAI ? 'ai-bubble' : 'user-bubble'}>
          <p className="text-body-medium whitespace-pre-wrap">{content}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 mt-1 text-label-small text-on-surface-variant">
          <span>{formatDate(timestamp)}</span>

          {/* AI message actions */}
          {isAI && (
            <>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="hover:text-primary transition-colors"
                  title="Regenerate"
                >
                  <span className="material-symbols-outlined text-base">
                    refresh
                  </span>
                </button>
              )}
              {onViewVersions && (
                <button
                  onClick={onViewVersions}
                  className="hover:text-primary transition-colors"
                  title="View versions"
                >
                  <span className="material-symbols-outlined text-base">
                    history
                  </span>
                </button>
              )}
              {onReaction && (
                <>
                  <button
                    onClick={() => onReaction(true)}
                    className="hover:text-primary transition-colors"
                    title="Good response"
                  >
                    <span className="material-symbols-outlined text-base">
                      thumb_up
                    </span>
                  </button>
                  <button
                    onClick={() => onReaction(false)}
                    className="hover:text-primary transition-colors"
                    title="Bad response"
                  >
                    <span className="material-symbols-outlined text-base">
                      thumb_down
                    </span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
