'use client';

import { formatDate, replacePlaceholders } from '@/lib/utils';
import { parseMessage } from '@/lib/messageParser';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  characterName?: string;
  characterImageUrl?: string;
  userName?: string;
  triggeredImages?: Array<{
    id: string;
    imageUrl: string;
    description?: string;
  }>;
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
  userName,
  triggeredImages,
  onRegenerate,
  onViewVersions,
  onReaction,
}: MessageBubbleProps) {
  const isAI = role === 'assistant';

  // Replace placeholders in content
  const processedContent = replacePlaceholders(content, userName, characterName);

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
          {isAI ? (
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
                  return <span key={idx}>{segment.text} </span>;
                }
              })}
            </div>
          ) : (
            <p className="text-body-medium whitespace-pre-wrap">
              {processedContent}
            </p>
          )}
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
