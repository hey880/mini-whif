'use client';

import { Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { SituationalImage } from '@/stores/characterWizardStore';
import { useState } from 'react';

interface SituationalImageCardProps {
  image: SituationalImage;
  onEdit: () => void;
  onDelete: () => void;
}

export function SituationalImageCard({
  image,
  onEdit,
  onDelete,
}: SituationalImageCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="glass-panel p-4">
      <div className="flex gap-4">
        <div className="w-24 h-24 rounded-lg bg-surface-container flex-shrink-0 overflow-hidden">
          {!imageError && image.imageUrl ? (
            <img
              src={image.imageUrl}
              alt={image.description || '상황별 이미지'}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
              <ImageIcon className="w-8 h-8" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              {image.description && (
                <p className="text-sm font-medium text-on-surface mb-1 truncate">
                  {image.description}
                </p>
              )}
              <div className="flex flex-wrap gap-1">
                {image.triggers.map((trigger, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs"
                  >
                    {trigger}
                  </span>
                ))}
              </div>
            </div>

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
          </div>

          <p className="text-xs text-on-surface-variant truncate">
            {image.imageUrl}
          </p>
        </div>
      </div>
    </div>
  );
}
