'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { characterClient, universeClient } from '@/lib/connectrpc/client';
import { CharacterCard } from '@/components/character/CharacterCard';
import { TopNav } from '@/components/layout/TopNav';
import type { Character } from '../../../../../packages/proto/gen/ts/character_pb';
import type { Universe } from '../../../../../packages/proto/gen/ts/universe_pb';
import Link from 'next/link';

function SearchContent() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get('q') || '';
  const showNsfw = searchParams.get('nsfw') === 'true';
  const [activeTab, setActiveTab] = useState<'characters' | 'universes'>('characters');

  // Fetch characters
  const { data: charactersData, isLoading: charactersLoading } = useQuery({
    queryKey: ['search-characters', keyword, showNsfw],
    queryFn: async () => {
      const response = await characterClient.listCharacters({
        keyword: keyword || undefined,
        limit: 20,
        offset: 0,
        isNsfw: showNsfw ? undefined : false,
      });
      return response;
    },
    enabled: activeTab === 'characters',
  });

  // Fetch universes
  const { data: universesData, isLoading: universesLoading } = useQuery({
    queryKey: ['search-universes', keyword],
    queryFn: async () => {
      const response = await universeClient.listUniverses({
        keyword: keyword || undefined,
        limit: 20,
        offset: 0,
        visibility: 'public',
      });
      return response;
    },
    enabled: activeTab === 'universes',
  });

  const isLoading = activeTab === 'characters' ? charactersLoading : universesLoading;

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      {/* Ambiance backgrounds */}
      <div className="fixed top-0 left-1/4 w-96 h-96 ambiance-primary" />
      <div className="fixed top-1/3 right-1/4 w-96 h-96 ambiance-secondary" />
      <div className="fixed bottom-0 left-1/2 w-96 h-96 ambiance-tertiary" />

      <main className="relative max-w-7xl mx-auto px-container-padding py-8 pb-32 lg:pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display-medium font-display text-primary mb-2">
            &quot;{keyword}&quot; 검색 결과
          </h1>
          <p className="text-body-large text-on-surface-variant">
            작품(세계관), 캐릭터, 작가, 키워드로 검색할 수 있습니다
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-outline-variant">
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
        </div>

        {/* Characters Tab */}
        {activeTab === 'characters' && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-card-gap">
                {[...Array(8)].map((_: undefined, i: number) => (
                  <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />
                ))}
              </div>
            ) : (
              <>
                {charactersData && charactersData.characters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-card-gap">
                    {charactersData.characters.map((char: Character) => (
                      <CharacterCard
                        key={char.id}
                        id={char.id}
                        name={char.name}
                        tagline={char.tagline || ''}
                        imageUrl={char.imageUrl || ''}
                        totalChatCount={char.totalChatCount}
                        keywords={char.keywords}
                        isNsfw={char.isNsfw}
                        creatorDisplayName={char.creatorDisplayName}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">
                      search_off
                    </span>
                    <p className="text-title-large text-on-surface-variant mb-2">
                      검색 결과가 없습니다
                    </p>
                    <p className="text-body-medium text-on-surface-variant">
                      다른 키워드로 검색해보세요
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Universes Tab */}
        {activeTab === 'universes' && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
                {[...Array(6)].map((_: undefined, i: number) => (
                  <div key={i} className="skeleton aspect-[16/9] rounded-2xl" />
                ))}
              </div>
            ) : (
              <>
                {universesData && universesData.universes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
                    {universesData.universes.map((universe: Universe) => (
                      <Link
                        key={universe.id}
                        href={`/universe/${universe.id}`}
                        className="group card-glow overflow-hidden"
                      >
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
                        </div>
                        <div className="p-4">
                          <h3 className="text-title-medium font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">
                            {universe.name}
                          </h3>
                          {universe.genre && (
                            <p className="text-label-small text-on-surface-variant mb-2">
                              {universe.genre}
                            </p>
                          )}
                          {universe.description && (
                            <p className="text-body-small text-on-surface-variant line-clamp-2 mb-3">
                              {universe.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-label-small text-on-surface-variant">
                            <span>{universe.creatorDisplayName || '작가'}</span>
                            <span>{universe.characterCount}개 캐릭터</span>
                          </div>
                          {universe.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
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
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">
                      search_off
                    </span>
                    <p className="text-title-large text-on-surface-variant mb-2">
                      검색 결과가 없습니다
                    </p>
                    <p className="text-body-medium text-on-surface-variant">
                      다른 키워드로 검색해보세요
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="skeleton w-16 h-16 rounded-full mx-auto mb-4" />
            <p className="text-body-large text-on-surface-variant">로딩 중...</p>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
