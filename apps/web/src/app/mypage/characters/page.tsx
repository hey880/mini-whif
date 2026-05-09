'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { characterClient } from '@/lib/connectrpc/client';
import { useAuthStore } from '@/stores/authStore';
import { CharacterCard } from '@/components/character/CharacterCard';
import { CharacterWizard } from '@/components/character/CharacterWizard';
import type { Character } from '../../../../../../packages/proto/gen/ts/character_pb';

export default function CharactersPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [nsfwFilter, setNsfwFilter] = useState<boolean | null>(null);

  // Fetch user's characters
  const { data: charactersData, isLoading } = useQuery({
    queryKey: ['myCharacters', user?.id],
    queryFn: async () => {
      if (!user?.id) return { characters: [], total: 0, hasMore: false };
      const response = await characterClient.listCharacters({
        creatorId: user.id,
        limit: 50,
        offset: 0,
      });
      return response;
    },
    enabled: !!user,
  });

  const characters = charactersData?.characters || [];

  // Apply filters
  const filteredCharacters = characters.filter((char) => {
    if (visibilityFilter !== 'all' && char.visibility !== visibilityFilter) {
      return false;
    }
    if (nsfwFilter !== null && char.isNsfw !== nsfwFilter) {
      return false;
    }
    return true;
  });


  // Delete character mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await characterClient.deleteCharacter({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCharacters'] });
    },
  });

  const handleCreateClick = () => {
    setEditingCharacter(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (character: Character) => {
    setEditingCharacter(character);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (character: Character) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${character.name}"? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate(character.id);
    }
  };

  const handleWizardSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['myCharacters'] });
    setIsModalOpen(false);
    setEditingCharacter(null);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-display-small font-display mb-2">내 캐릭터</h1>
            <p className="text-body-large text-on-surface-variant">
              Create and manage your AI characters
            </p>
          </div>
          <button onClick={handleCreateClick} className="glow-button">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined">add</span>
              New Character
            </span>
          </button>
        </div>

        {/* Filters */}
        {characters.length > 0 && (
          <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center gap-4">
            {/* Visibility Filter */}
            <div className="flex items-center gap-2">
              <span className="text-label-medium text-on-surface-variant">
                Visibility:
              </span>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'public', label: 'Public' },
                  { value: 'unlisted', label: 'Unlisted' },
                  { value: 'private', label: 'Private' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setVisibilityFilter(option.value)}
                    className={`tag-chip ${
                      visibilityFilter === option.value ? 'tag-chip-active' : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* NSFW Filter */}
            <div className="flex items-center gap-2">
              <span className="text-label-medium text-on-surface-variant">
                Content:
              </span>
              <div className="flex gap-2">
                {[
                  { value: null, label: 'All' },
                  { value: false, label: 'SFW' },
                  { value: true, label: 'NSFW' },
                ].map((option) => (
                  <button
                    key={String(option.value)}
                    onClick={() => setNsfwFilter(option.value)}
                    className={`tag-chip ${
                      nsfwFilter === option.value ? 'tag-chip-active' : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Count */}
            <span className="text-label-medium text-on-surface-variant ml-auto">
              {filteredCharacters.length} character{filteredCharacters.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-80 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && characters.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="max-w-md mx-auto">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
              palette
            </span>
            <h2 className="text-headline-medium font-headline mb-2">
              No characters yet
            </h2>
            <p className="text-body-large text-on-surface-variant mb-6">
              Create your first AI character to share with the community or keep
              for yourself. Define their personality, appearance, and backstory.
            </p>
            <button onClick={handleCreateClick} className="glow-button">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined">add</span>
                Create Your First Character
              </span>
            </button>
          </div>
        </div>
      )}

      {/* No Results After Filtering */}
      {!isLoading && characters.length > 0 && filteredCharacters.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="max-w-md mx-auto">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
              filter_alt_off
            </span>
            <h2 className="text-headline-medium font-headline mb-2">
              No matching characters
            </h2>
            <p className="text-body-large text-on-surface-variant mb-6">
              Try adjusting your filters to see more results
            </p>
            <button
              onClick={() => {
                setVisibilityFilter('all');
                setNsfwFilter(null);
              }}
              className="glow-button"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Characters Grid */}
      {!isLoading && filteredCharacters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCharacters.map((character) => (
            <div key={character.id} className="relative">
              <CharacterCard
                id={character.id}
                name={character.name}
                tagline={character.tagline}
                imageUrl={character.imageUrl}
                totalChatCount={character.totalChatCount}
                keywords={character.keywords}
                isNsfw={character.isNsfw}
              />

              {/* Edit/Delete Actions Overlay */}
              <div className="absolute top-2 right-2 flex gap-2 z-10">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleEditClick(character);
                  }}
                  className="p-2 rounded-lg bg-surface-container/90 hover:bg-primary hover:text-on-primary backdrop-blur-md transition-all"
                  title="Edit character"
                >
                  <span className="material-symbols-outlined text-xl">edit</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteClick(character);
                  }}
                  className="p-2 rounded-lg bg-surface-container/90 hover:bg-error hover:text-on-error backdrop-blur-md transition-all"
                  title="Delete character"
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Character Wizard */}
      <CharacterWizard
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCharacter(null);
        }}
        editingCharacter={editingCharacter}
        onSuccess={handleWizardSuccess}
      />
    </>
  );
}
