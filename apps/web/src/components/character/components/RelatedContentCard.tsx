'use client';

import { Edit2, Trash2, Image, Video, Link as LinkIcon } from 'lucide-react';
import { RelatedContent } from '@/stores/characterWizardStore';
import { useState } from 'react';
import { isYoutubeUrl, extractYoutubeVideoId } from '@/lib/linkify';

interface RelatedContentCardProps {
  content: RelatedContent;
  onEdit?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

const typeIcons = {
  image: Image,
  video: Video,
  link: LinkIcon,
};

const typeLabels = {
  image: '이미지',
  video: '영상',
  link: '링크',
};

export function RelatedContentCard({
  content,
  onEdit,
  onDelete,
  readOnly = false,
}: RelatedContentCardProps) {
  const [imageError, setImageError] = useState(false);
  const Icon = typeIcons[content.type];

  // Check if this is a YouTube video (type can be 'video' or 'link')
  const isYoutube = (content.type === 'video' || content.type === 'link') && isYoutubeUrl(content.url);
  const youtubeVideoId = isYoutube ? extractYoutubeVideoId(content.url) : null;

  return (
    <div className="glass-panel p-4">
      <div className="flex gap-4">
        <div className="w-24 h-24 rounded-lg bg-surface-container flex-shrink-0 overflow-hidden">
          {content.type === 'image' && !imageError ? (
            <img
              src={content.url}
              alt={content.title || '관련 콘텐츠'}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : isYoutube && youtubeVideoId ? (
            <img
              src={`https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`}
              alt={content.title || 'YouTube 영상'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant">
              <Icon className="w-8 h-8 mb-1" />
              <span className="text-xs">{typeLabels[content.type]}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container text-xs">
                  {typeLabels[content.type]}
                </span>
              </div>
              {content.title && (
                <p className="text-sm font-medium text-on-surface mb-1 truncate">
                  {content.title}
                </p>
              )}
              {content.description && (
                <p className="text-xs text-on-surface-variant line-clamp-2 mb-1">
                  {content.description}
                </p>
              )}
            </div>

            {!readOnly && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onEdit}
                  className="p-2 hover:bg-surface-container rounded-lg transition-colors"
                  title="수정"
                >
                  <Edit2 className="w-4 h-4 text-on-surface-variant" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-2 hover:bg-error-container rounded-lg transition-colors"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4 text-error" />
                </button>
              </div>
            )}
          </div>

          <a
            href={content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline truncate block"
          >
            {content.url}
          </a>
        </div>
      </div>

      {/* YouTube Player Embed (readOnly mode only) */}
      {readOnly && isYoutube && youtubeVideoId && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <Video className="w-4 h-4 text-error" />
            <span className="text-sm font-medium text-on-surface">YouTube 영상</span>
          </div>
          <div className="relative w-full rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={`https://www.youtube.com/embed/${youtubeVideoId}`}
              title={content.title || 'YouTube video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
