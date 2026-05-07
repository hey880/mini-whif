'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { characterClient, chatRoomClient, personaClient } from '@/lib/connectrpc/client';
import { TopNav } from '@/components/layout/TopNav';
import { useAuthStore } from '@/stores/authStore';
import { useState } from 'react';
import { formatNumber } from '@/lib/utils';

export default function CharacterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const characterId = params?.id as string;

  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');

  // Fetch character
  const { data: character, isLoading: loadingCharacter } = useQuery({
    queryKey: ['character', characterId],
    queryFn: async () => {
      const response = await characterClient.getCharacter({ id: characterId });
      return response.character;
    },
    enabled: !!characterId,
  });

  // Fetch user's personas
  const { data: personas } = useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const response = await personaClient.listPersonas({});
      return response.personas;
    },
    enabled: !!user,
  });

  // Create chat room mutation
  const createChatMutation = useMutation({
    mutationFn: async () => {
      const response = await chatRoomClient.createChatRoom({
        characterId,
        personaId: selectedPersonaId || undefined,
      });
      return response.chatRoom;
    },
    onSuccess: (chatRoom) => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      if (chatRoom) {
        router.push(`/chat/${chatRoom.id}`);
      }
    },
  });

  if (loadingCharacter) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="skeleton w-16 h-16 rounded-full mx-auto mb-4" />
            <div className="skeleton w-48 h-6 rounded mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">
              error
            </span>
            <p className="text-title-large text-on-surface-variant">
              Character not found
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      {/* Full-screen background */}
      <div className="fixed inset-0 -z-10">
        {character.bannerImageUrl || character.imageUrl ? (
          <>
            <img
              src={character.bannerImageUrl || character.imageUrl}
              alt={character.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
            <div className="absolute inset-0 gradient-overlay-top" />
            <div className="absolute inset-0 gradient-overlay-bottom" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-tertiary/20" />
        )}
      </div>

      <main className="relative max-w-7xl mx-auto px-container-padding py-8">
        <div className="grid md:grid-cols-[1fr,500px] gap-8">
          {/* Left side - Image */}
          <div className="flex items-center justify-center">
            <div className="glass-card p-4 max-w-md w-full">
              <div className="aspect-[3/4] relative rounded-xl overflow-hidden">
                {character.imageUrl ? (
                  <img
                    src={character.imageUrl}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-on-surface-variant">
                      person
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Info */}
          <div className="glass-card p-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-display-small font-display mb-2">
                {character.name}
              </h1>
              {character.tagline && (
                <p className="text-title-medium text-on-surface-variant">
                  {character.tagline}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 mb-6 pb-6 border-b border-outline-variant">
              <div className="text-center">
                <div className="text-title-large text-primary font-medium">
                  {formatNumber(character.totalChatCount)}
                </div>
                <div className="text-label-medium text-on-surface-variant">
                  Chats
                </div>
              </div>
              <div className="text-center">
                <div className="text-title-large text-primary font-medium">
                  {formatNumber(character.totalMessageCount)}
                </div>
                <div className="text-label-medium text-on-surface-variant">
                  Messages
                </div>
              </div>
            </div>

            {/* Description */}
            {character.description && (
              <div className="mb-6">
                <h3 className="text-title-medium mb-2">Description</h3>
                <p className="text-body-medium text-on-surface-variant whitespace-pre-wrap">
                  {character.description}
                </p>
              </div>
            )}

            {/* Greeting */}
            {character.greeting && (
              <div className="mb-6">
                <h3 className="text-title-medium mb-2">First Message</h3>
                <div className="ai-bubble">
                  <p className="text-body-medium whitespace-pre-wrap">
                    {character.greeting}
                  </p>
                </div>
              </div>
            )}

            {/* Keywords */}
            {character.keywords.length > 0 && (
              <div className="mb-6">
                <h3 className="text-title-medium mb-2">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {character.keywords.map((keyword: string) => (
                    <span key={keyword} className="tag-chip">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Persona Selection (if logged in) */}
            {user && personas && personas.length > 0 && (
              <div className="mb-6">
                <h3 className="text-title-medium mb-2">Select Your Persona</h3>
                <select
                  value={selectedPersonaId}
                  onChange={(e) => setSelectedPersonaId(e.target.value)}
                  className="w-full input-glow"
                >
                  <option value="">Default (No Persona)</option>
                  {personas.map((persona: { id: string; name: string }) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* CTA Button */}
            {user ? (
              <button
                onClick={() => createChatMutation.mutate()}
                disabled={createChatMutation.isPending}
                className="w-full glow-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createChatMutation.isPending
                  ? 'Creating...'
                  : 'Start Conversation'}
              </button>
            ) : (
              <button
                onClick={() => router.push('/login?returnUrl=' + window.location.pathname)}
                className="w-full glow-button"
              >
                Login to Chat
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
