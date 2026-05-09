'use client';

import { Edit2, Trash2, Star, StarOff } from 'lucide-react';
import { Greeting } from '@/stores/characterWizardStore';

interface GreetingCardProps {
  greeting: Greeting;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  canDelete: boolean;
}

export function GreetingCard({
  greeting,
  onEdit,
  onDelete,
  onSetDefault,
  canDelete,
}: GreetingCardProps) {
  return (
    <div
      className={`
      glass-panel p-4 transition-all
      ${greeting.isDefault ? 'ring-2 ring-primary/30' : ''}
    `}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-on-surface mb-1 flex items-center gap-2">
            {greeting.title}
            {greeting.isDefault && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-xs">
                기본
              </span>
            )}
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSetDefault}
            disabled={greeting.isDefault}
            className={`
              p-2 rounded-lg transition-colors
              ${
                greeting.isDefault
                  ? 'text-primary cursor-default'
                  : 'hover:bg-surface-container text-on-surface-variant'
              }
            `}
            title={greeting.isDefault ? '기본 도입부' : '기본으로 설정'}
          >
            {greeting.isDefault ? (
              <Star className="w-4 h-4 fill-current" />
            ) : (
              <StarOff className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 hover:bg-surface-container rounded-lg transition-colors"
            title="수정"
          >
            <Edit2 className="w-4 h-4 text-on-surface-variant" />
          </button>
          <button
            onClick={onDelete}
            disabled={!canDelete}
            className={`
              p-2 rounded-lg transition-colors
              ${
                canDelete
                  ? 'hover:bg-error-container text-error'
                  : 'opacity-30 cursor-not-allowed'
              }
            `}
            title={canDelete ? '삭제' : '최소 1개 필요'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-sm text-on-surface-variant whitespace-pre-wrap line-clamp-3">
        {greeting.content}
      </p>
    </div>
  );
}
