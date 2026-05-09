'use client';

interface PersonaCardProps {
  id: string;
  name: string;
  persona: string;
  isDefault: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}

export function PersonaCard({
  name,
  persona,
  isDefault,
  onEdit,
  onDelete,
  onSetDefault,
}: PersonaCardProps) {
  return (
    <div className="glass-card p-6 relative">
      {/* Default Badge */}
      {isDefault && (
        <div className="absolute top-4 right-4">
          <div className="px-3 py-1 rounded-full bg-primary text-on-primary text-label-small font-medium flex items-center gap-1">
            <span className="material-symbols-filled text-sm">star</span>
            Default
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mb-4 pr-20">
        <h3 className="text-title-large font-medium mb-2">{name}</h3>
        <p className="text-body-medium text-on-surface-variant line-clamp-3">
          {persona}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-label-large"
        >
          <span className="material-symbols-outlined text-lg">edit</span>
          Edit
        </button>

        {!isDefault && (
          <>
            <button
              onClick={onSetDefault}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-label-large"
            >
              <span className="material-symbols-outlined text-lg">star</span>
              Set Default
            </button>

            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-error-container/20 hover:bg-error-container/30 text-error transition-colors text-label-large ml-auto"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
