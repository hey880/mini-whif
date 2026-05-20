'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { universeClient, characterClient } from '@/lib/connectrpc/client';
import { CharacterCard } from '@/components/character/CharacterCard';
import Link from 'next/link';
import { ArrowLeft, Edit, Globe, Lock } from 'lucide-react';

export default function UniverseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const universeId = params.id as string;

  // Fetch universe details
  const { data: universe, isLoading: universeLoading } = useQuery({
    queryKey: ['universe', universeId],
    queryFn: async () => {
      return await universeClient.getUniverse({ id: universeId });
    },
    enabled: !!universeId,
  });

  // Fetch characters in this universe
  const { data: charactersData, isLoading: charactersLoading } = useQuery({
    queryKey: ['universe-characters', universeId],
    queryFn: async () => {
      return await characterClient.listCharacters({
        universeId,
        limit: 50,
        offset: 0,
      });
    },
    enabled: !!universeId,
  });

  const isLoading = universeLoading || charactersLoading;
  const characters = charactersData?.characters || [];
  const universeData = universe?.universe;

  if (isLoading) {
    return (
      <div className="pb-8">
        <div className="skeleton h-64 w-full rounded-2xl mb-6" />
        <div className="skeleton h-8 w-1/3 mb-4" />
        <div className="skeleton h-20 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!universeData) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="max-w-md mx-auto">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
            error
          </span>
          <h2 className="text-headline-medium font-headline mb-2">작품을 찾을 수 없습니다</h2>
          <p className="text-body-large text-on-surface-variant mb-6">
            요청하신 작품이 존재하지 않거나 삭제되었습니다.
          </p>
          <Link href="/" className="btn-primary">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 lg:pb-24">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-all group mb-4"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-label-large">뒤로가기</span>
        </button>

        {/* Cover Image */}
        {universeData.imageUrl && (
          <div className="aspect-[21/9] relative rounded-2xl overflow-hidden mb-6">
            <img
              src={universeData.imageUrl}
              alt={universeData.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />

            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-display-medium font-display mb-2">{universeData.name}</h1>
                  {universeData.genre && (
                    <p className="text-title-medium text-on-surface-variant">{universeData.genre}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {universeData.visibility === 'public' ? (
                    <span className="px-3 py-1.5 rounded-full bg-primary text-on-primary flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      공개
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface flex items-center gap-1">
                      <Lock className="w-4 h-4" />
                      비공개
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Title (if no image) */}
        {!universeData.imageUrl && (
          <div className="mb-6">
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-display-medium font-display">{universeData.name}</h1>
              <div className="flex items-center gap-2">
                {universeData.visibility === 'public' ? (
                  <span className="px-3 py-1.5 rounded-full bg-primary text-on-primary flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    공개
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface flex items-center gap-1">
                    <Lock className="w-4 h-4" />
                    비공개
                  </span>
                )}
              </div>
            </div>
            {universeData.genre && (
              <p className="text-title-medium text-on-surface-variant">{universeData.genre}</p>
            )}
          </div>
        )}

        {/* Creator */}
        {universeData.creatorDisplayName && (
          <div className="glass-panel p-6 rounded-2xl mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant">
                person
              </span>
              <div>
                <div className="text-label-small text-on-surface-variant">
                  Created by
                </div>
                <div className="text-body-large text-on-surface">
                  {universeData.creatorDisplayName}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {universeData.description && (
          <div className="glass-panel p-6 rounded-2xl mb-6">
            <h2 className="text-title-large font-bold mb-3">작품 소개</h2>
            <p className="text-body-large text-on-surface-variant whitespace-pre-wrap">
              {universeData.description}
            </p>
          </div>
        )}

        {/* Tags */}
        {universeData.tags && universeData.tags.length > 0 && (
          <div className="glass-panel p-6 rounded-2xl mb-6">
            <h2 className="text-title-large font-bold mb-3">태그</h2>
            <div className="flex flex-wrap gap-2">
              {universeData.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 rounded-full bg-primary-container text-on-primary-container"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lorebook (if exists and not secret) */}
        {universeData.lorebookJson && (
          <div className="glass-panel p-6 rounded-2xl mb-6">
            <h2 className="text-title-large font-bold mb-3">키워드북</h2>
            <div className="space-y-3">
              {(() => {
                try {
                  const lorebook = JSON.parse(universeData.lorebookJson);
                  const publicEntries = lorebook.entries?.filter((entry: any) => !entry.isSecret) || [];

                  if (publicEntries.length === 0) {
                    return (
                      <p className="text-body-medium text-on-surface-variant">
                        공개된 키워드북이 없습니다.
                      </p>
                    );
                  }

                  return publicEntries.map((entry: any, index: number) => (
                    <div key={index} className="p-4 bg-surface-container rounded-xl">
                      <h3 className="font-medium text-on-surface mb-2">{entry.name}</h3>
                      <p className="text-sm text-on-surface-variant mb-2">{entry.content}</p>
                      <div className="flex flex-wrap gap-1">
                        {entry.keywords?.map((keyword: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container text-xs"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  ));
                } catch (e) {
                  return null;
                }
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Characters Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-headline-large font-headline">
            캐릭터 ({universeData.characterCount || 0})
          </h2>
        </div>

        {characters.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="max-w-md mx-auto">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
                palette
              </span>
              <h3 className="text-headline-medium font-headline mb-2">캐릭터가 없습니다</h3>
              <p className="text-body-large text-on-surface-variant">
                이 작품에 등록된 캐릭터가 아직 없습니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                id={character.id}
                name={character.name}
                tagline={character.tagline}
                imageUrl={character.imageUrl}
                totalChatCount={character.totalChatCount}
                keywords={character.keywords}
                isNsfw={character.isNsfw}
                creatorDisplayName={character.creatorDisplayName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
