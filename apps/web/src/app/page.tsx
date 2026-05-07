'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { characterClient } from '@/lib/connectrpc/client';
import { CharacterCard } from '@/components/character/CharacterCard';
import { TopNav } from '@/components/layout/TopNav';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Character } from '../../../../packages/proto/gen/ts/character_pb';

export default function HomePage() {
  const [keyword, setKeyword] = useState<string>('');
  const [showNsfw, setShowNsfw] = useState(false);
  const { setSession } = useAuthStore();

  // Initialize auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  // Fetch characters
  const { data, isLoading } = useQuery({
    queryKey: ['characters', keyword, showNsfw],
    queryFn: async () => {
      const response = await characterClient.listCharacters({
        keyword: keyword || undefined,
        limit: 16,
        offset: 0,
        isNsfw: showNsfw ? undefined : false,
      });
      return response;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      {/* Ambiance backgrounds */}
      <div className="fixed top-0 left-1/4 w-96 h-96 ambiance-primary" />
      <div className="fixed top-1/3 right-1/4 w-96 h-96 ambiance-secondary" />
      <div className="fixed bottom-0 left-1/2 w-96 h-96 ambiance-tertiary" />

      <main className="relative max-w-7xl mx-auto px-container-padding py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display-medium font-display text-primary mb-2">
            Discover AI Characters
          </h1>
          <p className="text-body-large text-on-surface-variant">
            Explore thousands of unique personalities and start conversations
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-8">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by keyword..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full input-glow pr-10"
              />
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
            </div>
          </div>

          {/* NSFW Toggle */}
          <button
            onClick={() => setShowNsfw(!showNsfw)}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              showNsfw
                ? 'bg-error text-on-error'
                : 'bg-surface-container-high text-on-surface'
            }`}
          >
            {showNsfw ? 'UNSAFE' : 'SAFE'}
          </button>
        </div>

        {/* Character Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-card-gap">
            {[...Array(8)].map((_: undefined, i: number) => (
              <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-card-gap">
            {data?.characters.map((char: Character, index: number) => (
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
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && data?.characters.length === 0 && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">
              search_off
            </span>
            <p className="text-title-large text-on-surface-variant">
              No characters found
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
