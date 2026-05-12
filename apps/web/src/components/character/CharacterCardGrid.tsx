'use client';

import { useQuery } from '@tanstack/react-query';
import { createPromiseClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { CharacterService } from '@persona-chat/proto/gen/ts/character_connect';
import Image from 'next/image';

const transport = createConnectTransport({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

const characterClient = createPromiseClient(CharacterService, transport);

interface CharacterCard {
  id: string;
  name: string;
  imageUrl?: string;
  tagline?: string;
  description?: string;
}

interface CharacterCardGridProps {
  universeId: string;
  onCharacterSelect: (character: CharacterCard) => void;
  excludeCharacterId?: string;
}

export function CharacterCardGrid({
  universeId,
  onCharacterSelect,
  excludeCharacterId,
}: CharacterCardGridProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['characters-by-universe', universeId],
    queryFn: async () => {
      const response = await characterClient.listCharactersByUniverse({
        universeId,
      });
      return response.characters;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="glass-card p-3 rounded-xl animate-pulse"
          >
            <div className="aspect-square bg-surface-container-high rounded-lg mb-2" />
            <div className="h-4 bg-surface-container-high rounded w-3/4 mb-1" />
            <div className="h-3 bg-surface-container-high rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  const filteredCharacters = data?.filter(
    (char) => char.id !== excludeCharacterId
  );

  if (!filteredCharacters || filteredCharacters.length === 0) {
    return (
      <div className="text-center py-8 text-on-surface-variant">
        같은 세계관의 다른 캐릭터가 없습니다
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {filteredCharacters.map((character) => (
        <button
          key={character.id}
          onClick={() => onCharacterSelect(character)}
          className="glass-card p-3 rounded-xl hover:bg-surface-container-high transition-all group text-left"
        >
          <div className="aspect-square rounded-lg overflow-hidden bg-surface-container-high mb-2 relative">
            {character.imageUrl ? (
              <Image
                src={character.imageUrl}
                alt={character.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-headline-large text-on-surface-variant">
                {character.name[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <h4 className="text-title-small font-medium truncate mb-0.5 group-hover:text-primary transition-colors">
            {character.name}
          </h4>
          {character.tagline && (
            <p className="text-label-small text-on-surface-variant line-clamp-2">
              {character.tagline}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}
