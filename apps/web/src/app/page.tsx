'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { characterClient, universeClient } from '@/lib/connectrpc/client';
import { CharacterCard } from '@/components/character/CharacterCard';
import { TopNav } from '@/components/layout/TopNav';
import type { Character } from '../../../../packages/proto/gen/ts/character_pb';
import type { Universe } from '../../../../packages/proto/gen/ts/universe_pb';
import Link from 'next/link';
import { POPULAR_TAGS } from '@/constants/universeTags';

export default function HomePage() {
  const [keyword, setKeyword] = useState<string>('');
  const [showNsfw, setShowNsfw] = useState(false);
  const [activeTab, setActiveTab] = useState<'characters' | 'universes'>('characters');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const router = useRouter();

  // Build search keyword with tags
  const buildSearchKeyword = () => {
    const parts = [];
    if (keyword) parts.push(keyword);
    if (selectedTags.length > 0) parts.push(...selectedTags);
    return parts.join(' ');
  };

  // Fetch characters
  const { data: charactersData, isLoading: charactersLoading } = useQuery({
    queryKey: ['home-characters', keyword, showNsfw, selectedTags],
    queryFn: async () => {
      const searchKeyword = buildSearchKeyword();
      const response = await characterClient.listCharacters({
        keyword: searchKeyword || undefined,
        limit: 16,
        offset: 0,
        isNsfw: showNsfw ? undefined : false,
      });
      return response;
    },
    enabled: activeTab === 'characters',
  });

  // Fetch universes
  const { data: universesData, isLoading: universesLoading } = useQuery({
    queryKey: ['home-universes', keyword, selectedTags],
    queryFn: async () => {
      const searchKeyword = buildSearchKeyword();
      const response = await universeClient.listUniverses({
        keyword: searchKeyword || undefined,
        limit: 16,
        offset: 0,
        visibility: 'public',
      });
      return response;
    },
    enabled: activeTab === 'universes',
  });

  const isLoading = activeTab === 'characters' ? charactersLoading : universesLoading;

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim() || selectedTags.length > 0) {
      const searchKeyword = buildSearchKeyword();
      router.push(`/search?q=${encodeURIComponent(searchKeyword)}&nsfw=${showNsfw}`);
    }
  };

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav
        showNsfwToggle={true}
        showNsfw={showNsfw}
        onToggleNsfw={() => setShowNsfw(!showNsfw)}
      />

      {/* Ambiance backgrounds */}
      <div className="fixed top-0 left-1/4 w-96 h-96 ambiance-primary" />
      <div className="fixed top-1/3 right-1/4 w-96 h-96 ambiance-secondary" />
      <div className="fixed bottom-0 left-1/2 w-96 h-96 ambiance-tertiary" />

      <main className="relative max-w-7xl mx-auto px-container-padding py-8 pb-32 lg:pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display-medium font-display text-primary mb-2">
            Discover AI Characters
          </h1>
          <p className="text-body-large text-on-surface-variant">
            작품(세계관), 캐릭터, 작가, 키워드로 검색할 수 있습니다
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="작품, 캐릭터, 작가, 키워드로 검색..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full input-glow pr-10"
            />
            <button
              type="submit"
              className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
            >
              search
            </button>
          </div>
        </form>

        {/* Popular Tags */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">
              local_offer
            </span>
            <span className="text-label-medium text-on-surface-variant">
              인기 태그로 검색
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-label-small transition-all ${
                    isSelected
                      ? 'bg-primary text-on-primary shadow-lg'
                      : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          {selectedTags.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-label-small text-on-surface-variant">
                선택된 태그:
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-label-small"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTags([])}
                className="text-label-small text-on-surface-variant hover:text-error transition-colors ml-2"
              >
                초기화
              </button>
            </div>
          )}
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
                    {charactersData.characters.map((char: Character, index: number) => (
                      <CharacterCard
                        key={char.id}
                        id={char.id}
                        name={char.name}
                        tagline={char.tagline || ''}
                        imageUrl={char.imageUrl || ''}
                        totalChatCount={char.totalChatCount}
                        keywords={char.keywords}
                        isNsfw={char.isNsfw}
                        rank={index === 0 ? 1 : undefined}
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
                      캐릭터를 찾을 수 없습니다
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
                            <span>by {universe.creatorDisplayName || '작가'}</span>
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
                      작품을 찾을 수 없습니다
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
