'use client';

import { Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { LorebookEntry as LorebookEntryType } from '@/stores/characterWizardStore';

interface LorebookEntryProps {
  entry: LorebookEntryType;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

export function LorebookEntry({
  entry,
  onEdit,
  onDelete,
  onToggle,
}: LorebookEntryProps) {
  return (
    <div
      className={`
      glass-panel p-4 transition-all
      ${entry.enabled ? '' : 'opacity-60'}
    `}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-on-surface mb-1 truncate">
            {entry.key}
          </h4>
          <div className="flex flex-wrap gap-1">
            {entry.triggers.map((trigger, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container text-xs"
              >
                {trigger}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-2 hover:bg-surface-container rounded-lg transition-colors"
            title={entry.enabled ? '비활성화' : '활성화'}
          >
            {entry.enabled ? (
              <ToggleRight className="w-5 h-5 text-primary" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-on-surface-variant" />
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
            className="p-2 hover:bg-error-container rounded-lg transition-colors"
            title="삭제"
          >
            <Trash2 className="w-4 h-4 text-error" />
          </button>
        </div>
      </div>

      <p className="text-sm text-on-surface-variant line-clamp-2">
        {entry.content}
      </p>

      {entry.priority !== undefined && entry.priority !== 5 && (
        <div className="mt-2 text-xs text-on-surface-variant">
          우선순위: {entry.priority}
        </div>
      )}
    </div>
  );
}
