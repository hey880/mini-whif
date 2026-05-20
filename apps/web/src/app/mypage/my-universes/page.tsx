'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { universeClient, characterClient } from '@/lib/connectrpc/client';
import { useAuthStore } from '@/stores/authStore';
import { CharacterCard } from '@/components/character/CharacterCard';
import { CharacterWizard } from '@/components/character/CharacterWizard';
import { UniverseWizard } from '@/components/universe/UniverseWizard';
import type { Universe } from '../../../../../../packages/proto/gen/ts/universe_pb';
import type { Character } from '../../../../../../packages/proto/gen/ts/character_pb';
import Link from 'next/link';

export default function MyUniversesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'universes' | 'characters'>('universes');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');

  // Wizard states
  const [isUniverseWizardOpen, setIsUniverseWizardOpen] = useState(false);
  const [isCharacterWizardOpen, setIsCharacterWizardOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [editingUniverse, setEditingUniverse] = useState<Universe | null>(null);

  // Fetch universes
  const { data: universesData, isLoading: universesLoading } = useQuery({
    queryKey: ['my-universes', visibilityFilter, user?.id],
    queryFn: async () => {
      if (!user?.id) return { universes: [], total: 0, hasMore: false };

      const visibility = visibilityFilter === 'all' ? undefined : visibilityFilter;
      return await universeClient.listUniverses({
        visibility,
        creatorId: user.id,
        limit: 50,
        offset: 0,
      });
    },
    enabled: !!user?.id && activeTab === 'universes',
  });

  // Fetch characters
  const { data: charactersData, isLoading: charactersLoading } = useQuery({
    queryKey: ['my-characters', visibilityFilter, user?.id],
    queryFn: async () => {
      if (!user?.id) return { characters: [], total: 0, hasMore: false };

      const visibility = visibilityFilter === 'all' ? undefined : visibilityFilter;
      return await characterClient.listCharacters({
        creatorId: user.id,
        visibility,
        limit: 50,
        offset: 0,
      });
    },
    enabled: !!user?.id && activeTab === 'characters',
  });

  // Delete mutations
  const deleteUniverseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await universeClient.deleteUniverse({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-universes'] });
    },
  });

  const deleteCharacterMutation = useMutation({
    mutationFn: async (id: string) => {
      return await characterClient.deleteCharacter({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-characters'] });
    },
  });

  const handleDeleteUniverse = (universe: Universe) => {
    if (
      window.confirm(
        `"${universe.name}" 작품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      deleteUniverseMutation.mutate(universe.id);
    }
  };

  const handleDeleteCharacter = (character: Character) => {
    if (
      window.confirm(
        `"${character.name}" 캐릭터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      deleteCharacterMutation.mutate(character.id);
    }
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setIsCharacterWizardOpen(true);
  };

  const handleEditUniverse = (universe: Universe) => {
    setEditingUniverse(universe);
    setIsUniverseWizardOpen(true);
  };

  const handleWizardSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['my-universes'] });
    queryClient.invalidateQueries({ queryKey: ['my-characters'] });
    setIsUniverseWizardOpen(false);
    setIsCharacterWizardOpen(false);
    setEditingCharacter(null);
    setEditingUniverse(null);
  };

  const isLoading = activeTab === 'universes' ? universesLoading : charactersLoading;
  const universes = universesData?.universes || [];
  const characters = charactersData?.characters || [];

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-4 text-on-surface hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-label-large">뒤로</span>
        </button>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-display-small font-display mb-2">내 작품/캐릭터</h1>
            <p className="text-body-large text-on-surface-variant">
              작품 세계관과 AI 캐릭터를 만들고 관리합니다
            </p>
          </div>
          <button
            onClick={() => {
              if (activeTab === 'universes') {
                setEditingUniverse(null);
                setIsUniverseWizardOpen(true);
              } else {
                setEditingCharacter(null);
                setIsCharacterWizardOpen(true);
              }
            }}
            className="glow-button"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined">add</span>
              {activeTab === 'universes' ? '작품 만들기' : '캐릭터 만들기'}
            </span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-outline-variant">
          <button
            onClick={() => setActiveTab('universes')}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeTab === 'universes'
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            작품
            {activeTab === 'universes' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('characters')}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeTab === 'characters'
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            캐릭터
            {activeTab === 'characters' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Filters - Always show */}
        {!isLoading && (
          <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-label-medium text-on-surface-variant">공개 설정:</span>
              <div className="flex gap-2">
                {[
                  { value: 'all' as const, label: '전체' },
                  { value: 'public' as const, label: '공개' },
                  { value: 'private' as const, label: '비공개' },
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

            <span className="text-label-medium text-on-surface-variant ml-auto">
              {activeTab === 'universes' ? universes.length : characters.length}개
            </span>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_: undefined, i: number) => (
            <div key={i} className="skeleton h-80 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty State - Universes */}
      {!isLoading && activeTab === 'universes' && universes.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="max-w-md mx-auto">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
              auto_stories
            </span>
            <h2 className="text-headline-medium font-headline mb-2">작품이 없습니다</h2>
            <p className="text-body-large text-on-surface-variant mb-6">
              첫 번째 작품을 만들어보세요. 세계관을 정의하고 캐릭터들이 살아갈 무대를
              설정하세요.
            </p>
            <button
              onClick={() => {
                setEditingUniverse(null);
                setIsUniverseWizardOpen(true);
              }}
              className="glow-button"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined">add</span>
                첫 작품 만들기
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Empty State - Characters */}
      {!isLoading && activeTab === 'characters' && characters.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="max-w-md mx-auto">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
              palette
            </span>
            <h2 className="text-headline-medium font-headline mb-2">캐릭터가 없습니다</h2>
            <p className="text-body-large text-on-surface-variant mb-6">
              첫 번째 AI 캐릭터를 만들어보세요. 개성과 배경 스토리를 정의하세요.
            </p>
            <button
              onClick={() => {
                setEditingCharacter(null);
                setIsCharacterWizardOpen(true);
              }}
              className="glow-button"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined">add</span>
                첫 캐릭터 만들기
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Universes Grid */}
      {!isLoading && activeTab === 'universes' && universes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {universes.map((universe: Universe) => (
            <div key={universe.id} className="glass-card overflow-hidden group relative">
              <div className="aspect-[16/9] relative bg-surface-container-highest">
                {universe.imageUrl ? (
                  <img
                    src={universe.imageUrl}
                    alt={universe.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-on-surface-variant">
                      photo_library
                    </span>
                  </div>
                )}

                <div className="absolute top-2 right-2 flex gap-2 z-10">
                  <Link
                    href={`/universe/${universe.id}`}
                    className="p-2 rounded-lg bg-surface-container/90 hover:bg-primary hover:text-on-primary backdrop-blur-md transition-all"
                    title="보기"
                  >
                    <span className="material-symbols-outlined text-xl">visibility</span>
                  </Link>
                  <button
                    onClick={() => handleEditUniverse(universe)}
                    className="p-2 rounded-lg bg-surface-container/90 hover:bg-primary hover:text-on-primary backdrop-blur-md transition-all"
                    title="수정"
                  >
                    <span className="material-symbols-outlined text-xl">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteUniverse(universe)}
                    className="p-2 rounded-lg bg-surface-container/90 hover:bg-error hover:text-on-error backdrop-blur-md transition-all"
                    title="삭제"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>

                <div className="absolute top-2 left-2">
                  <span
                    className={`px-2 py-1 rounded-full text-label-small ${
                      universe.visibility === 'public'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface'
                    }`}
                  >
                    {universe.visibility === 'public' ? '공개' : '비공개'}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-title-medium font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">
                  {universe.name}
                </h3>
                {universe.genre && (
                  <p className="text-label-small text-on-surface-variant mb-2">{universe.genre}</p>
                )}
                {universe.description && (
                  <p className="text-body-small text-on-surface-variant line-clamp-2 mb-3">
                    {universe.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-label-small text-on-surface-variant mb-3">
                  <span>{universe.characterCount}개 캐릭터</span>
                  <span>{new Date(universe.createdAt).toLocaleDateString()}</span>
                </div>

                {universe.tags && universe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {universe.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded-full bg-surface-container text-label-small text-on-surface"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Characters Grid */}
      {!isLoading && activeTab === 'characters' && characters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((character: Character) => (
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

              <div className="absolute top-2 right-2 flex gap-2 z-10">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleEditCharacter(character);
                  }}
                  className="p-2 rounded-lg bg-surface-container/90 hover:bg-primary hover:text-on-primary backdrop-blur-md transition-all"
                  title="수정"
                >
                  <span className="material-symbols-outlined text-xl">edit</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteCharacter(character);
                  }}
                  className="p-2 rounded-lg bg-surface-container/90 hover:bg-error hover:text-on-error backdrop-blur-md transition-all"
                  title="삭제"
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Wizards */}
      <UniverseWizard
        isOpen={isUniverseWizardOpen}
        onClose={() => {
          setIsUniverseWizardOpen(false);
          setEditingUniverse(null);
        }}
        onSuccess={handleWizardSuccess}
        editingUniverse={editingUniverse}
      />

      <CharacterWizard
        isOpen={isCharacterWizardOpen}
        onClose={() => {
          setIsCharacterWizardOpen(false);
          setEditingCharacter(null);
        }}
        editingCharacter={editingCharacter}
        onSuccess={handleWizardSuccess}
      />
    </div>
  );
}
