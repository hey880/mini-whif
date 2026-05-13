'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { personaClient } from '@/lib/connectrpc/client';
import { PersonaCard } from '@/components/persona/PersonaCard';
import { PersonaFormModal } from '@/components/persona/PersonaFormModal';
import type { Persona } from '../../../../../../packages/proto/gen/ts/persona_pb';

interface PersonaFormData {
  name: string;
  persona: string;
  isDefault?: boolean;
}

export default function PersonasPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  // Fetch personas
  const { data: personasData, isLoading } = useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const response = await personaClient.listPersonas({});
      return response;
    },
  });

  const personas = personasData?.personas || [];

  // Create persona mutation
  const createMutation = useMutation({
    mutationFn: async (data: PersonaFormData) => {
      return await personaClient.createPersona({
        name: data.name,
        persona: data.persona,
        gender: data.gender,
        isDefault: data.isDefault || false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      setIsModalOpen(false);
    },
  });

  // Update persona mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: PersonaFormData & { id: string }) => {
      return await personaClient.updatePersona({
        id,
        name: data.name,
        persona: data.persona,
        gender: data.gender,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      setIsModalOpen(false);
      setEditingPersona(null);
    },
  });

  // Delete persona mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await personaClient.deletePersona({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
    },
  });

  // Set default persona mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await personaClient.setDefaultPersona({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
    },
  });

  const handleCreateClick = () => {
    setEditingPersona(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (persona: Persona) => {
    setEditingPersona(persona);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (persona: Persona) => {
    if (
      window.confirm(
        `Are you sure you want to delete the persona "${persona.name}"?`
      )
    ) {
      deleteMutation.mutate(persona.id);
    }
  };

  const handleSetDefaultClick = (persona: Persona) => {
    setDefaultMutation.mutate(persona.id);
  };

  const handleFormSubmit = (data: PersonaFormData) => {
    if (editingPersona) {
      updateMutation.mutate({ id: editingPersona.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-display-small font-display mb-2">내 페르소나</h1>
          <p className="text-body-large text-on-surface-variant">
            Create and manage your roleplay personas
          </p>
        </div>
        <button onClick={handleCreateClick} className="glow-button">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined">add</span>
            New Persona
          </span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && personas.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="max-w-md mx-auto">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
              face
            </span>
            <h2 className="text-headline-medium font-headline mb-2">
              No personas yet
            </h2>
            <p className="text-body-large text-on-surface-variant mb-6">
              Create your first persona to customize how AI characters interact with
              you. Define your personality, role, and background.
            </p>
            <button onClick={handleCreateClick} className="glow-button">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined">add</span>
                Create Your First Persona
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Personas Grid */}
      {!isLoading && personas.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              id={persona.id}
              name={persona.name}
              persona={persona.persona}
              isDefault={persona.isDefault}
              onEdit={() => handleEditClick(persona)}
              onDelete={() => handleDeleteClick(persona)}
              onSetDefault={() => handleSetDefaultClick(persona)}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <PersonaFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPersona(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={
          editingPersona
            ? {
                name: editingPersona.name,
                persona: editingPersona.persona,
                gender: editingPersona.gender,
              }
            : undefined
        }
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}
