'use client';

import { useState, useEffect } from 'react';

interface PersonaFormData {
  name: string;
  persona: string;
  isDefault?: boolean;
}

interface PersonaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PersonaFormData) => void;
  initialData?: PersonaFormData;
  isLoading?: boolean;
}

export function PersonaFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}: PersonaFormModalProps) {
  const [formData, setFormData] = useState<PersonaFormData>({
    name: '',
    persona: '',
    isDefault: false,
  });

  const [errors, setErrors] = useState<Partial<PersonaFormData>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ name: '', persona: '', isDefault: false });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = (): boolean => {
    const newErrors: Partial<PersonaFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be 50 characters or less';
    }

    if (!formData.persona.trim()) {
      newErrors.persona = 'Persona description is required';
    } else if (formData.persona.length > 500) {
      newErrors.persona = 'Persona must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative glass-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-headline-large font-headline">
            {initialData ? 'Edit Persona' : 'Create New Persona'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
            disabled={isLoading}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-label-large font-medium mb-2">
              Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="input-glow w-full"
              placeholder="e.g., Professional, Casual, Fantasy Hero"
              maxLength={50}
              disabled={isLoading}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.name && (
                <span className="text-label-small text-error">
                  {errors.name}
                </span>
              )}
              <span className="text-label-small text-on-surface-variant ml-auto">
                {formData.name.length}/50
              </span>
            </div>
          </div>

          {/* Persona Description */}
          <div>
            <label className="block text-label-large font-medium mb-2">
              Persona Description <span className="text-error">*</span>
            </label>
            <textarea
              value={formData.persona}
              onChange={(e) =>
                setFormData({ ...formData, persona: e.target.value })
              }
              className="input-glow w-full min-h-[120px] resize-y"
              placeholder="Describe your persona in detail. This will affect how the AI responds to you..."
              maxLength={500}
              disabled={isLoading}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.persona && (
                <span className="text-label-small text-error">
                  {errors.persona}
                </span>
              )}
              <span className="text-label-small text-on-surface-variant ml-auto">
                {formData.persona.length}/500
              </span>
            </div>
          </div>

          {/* Set as Default */}
          {!initialData && (
            <div className="flex items-center gap-3 glass-panel p-4 rounded-lg">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) =>
                  setFormData({ ...formData, isDefault: e.target.checked })
                }
                className="w-5 h-5 rounded accent-primary"
                disabled={isLoading}
              />
              <label htmlFor="isDefault" className="text-body-medium flex-1">
                Set as default persona
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-label-large font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 glow-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin">
                    progress_activity
                  </span>
                  Saving...
                </span>
              ) : initialData ? (
                'Update Persona'
              ) : (
                'Create Persona'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
