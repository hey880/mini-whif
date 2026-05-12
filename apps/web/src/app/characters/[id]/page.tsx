'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { characterClient, chatRoomClient, personaClient } from '@/lib/connectrpc/client';
import { TopNav } from '@/components/layout/TopNav';
import { useAuthStore } from '@/stores/authStore';
import { useState } from 'react';
import { formatNumber } from '@/lib/utils';
import { RelatedContentCard } from '@/components/character/components/RelatedContentCard';
import { linkifyText } from '@/lib/linkify';
import { ChatRoomCreationModal } from '@/components/chat/ChatRoomCreationModal';
import { PersonaSelectionModal } from '@/components/persona/PersonaSelectionModal';
import { toast } from 'sonner';

export default function CharacterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const characterId = params?.id as string;

  const [showCreationModal, setShowCreationModal] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [creationOption, setCreationOption] = useState<'continue' | 'new' | 'clone'>();
  const [recentRoomId, setRecentRoomId] = useState<string>();

  // Fetch character
  const { data: character, isLoading: loadingCharacter } = useQuery({
    queryKey: ['character', characterId],
    queryFn: async () => {
      const response = await characterClient.getCharacter({ id: characterId });
      return response.character;
    },
    enabled: !!characterId,
  });

  // Fetch recent room for this character
  const { data: recentRoomData } = useQuery({
    queryKey: ['recentRoom', characterId],
    queryFn: async () => {
      const response = await chatRoomClient.findRecentRoomByCharacter({
        characterId,
      });
      return response.chatRoom;
    },
    enabled: !!user && !!characterId,
  });

  // Parse dataJson to extract additional info
  let characterData: any = {};
  try {
    if (character?.dataJson) {
      characterData = JSON.parse(character.dataJson);
    }
  } catch (e) {
    console.error('Failed to parse character data:', e);
  }

  const relatedContent = characterData.relatedContent || [];
  const situationalImages = characterData.situationalImages || [];
  const exampleDialogues = characterData.exampleDialogues || [];
  const authorComments = characterData.authorComments;

  // Create chat room mutation
  const createChatMutation = useMutation({
    mutationFn: async (personaId?: string) => {
      const response = await chatRoomClient.createChatRoom({
        characterId,
        personaId: personaId || undefined,
      });
      return response.chatRoom;
    },
    onSuccess: (chatRoom) => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      if (chatRoom) {
        router.push(`/chat/${chatRoom.id}`);
      }
    },
    onError: () => {
      toast.error('채팅방 생성에 실패했습니다');
    },
  });

  // Clone chat room mutation
  const cloneChatMutation = useMutation({
    mutationFn: async ({ sourceRoomId, personaId }: { sourceRoomId: string; personaId?: string }) => {
      const response = await chatRoomClient.cloneChatRoom({
        sourceRoomId,
        personaId,
      });
      return response.chatRoom;
    },
    onSuccess: (chatRoom) => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      if (chatRoom) {
        router.push(`/chat/${chatRoom.id}`);
      }
    },
    onError: () => {
      toast.error('채팅방 복사에 실패했습니다');
    },
  });

  // Handle modal option selection
  const handleOptionSelected = (option: 'continue' | 'new' | 'clone') => {
    setCreationOption(option);

    if (option === 'continue' && recentRoomData) {
      router.push(`/chat/${recentRoomData.id}`);
    } else if (option === 'new' || option === 'clone') {
      setShowPersonaModal(true);
    }
  };

  // Handle persona selection complete
  const handlePersonaComplete = (personaId: string) => {
    if (creationOption === 'clone' && recentRoomData) {
      cloneChatMutation.mutate({ sourceRoomId: recentRoomData.id, personaId });
    } else {
      createChatMutation.mutate(personaId);
    }
  };

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
                <div className="text-body-medium text-on-surface-variant whitespace-pre-wrap">
                  {linkifyText(character.description)}
                </div>
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

            {/* Related Content */}
            {relatedContent.length > 0 && (
              <div className="mb-6">
                <h3 className="text-title-medium mb-2">관련 콘텐츠</h3>
                <div className="grid grid-cols-1 gap-3">
                  {relatedContent.map((content: any) => (
                    <RelatedContentCard
                      key={content.id}
                      content={content}
                      readOnly={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Situational Images */}
            {situationalImages.length > 0 && (
              <div className="mb-6">
                <h3 className="text-title-medium mb-2">상황별 이미지</h3>
                <div className="grid grid-cols-2 gap-3">
                  {situationalImages.map((img: any) => (
                    <div key={img.id} className="space-y-2">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-surface-container">
                        <img
                          src={img.imageUrl}
                          alt={img.description || '상황별 이미지'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {img.description && (
                        <p className="text-label-small text-on-surface-variant">
                          {img.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {img.triggers.map((trigger: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-label-small bg-surface-container-high rounded"
                          >
                            {trigger}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Example Dialogues */}
            {exampleDialogues.length > 0 && (
              <div className="mb-6">
                <h3 className="text-title-medium mb-2">예제 대화</h3>
                <div className="space-y-3">
                  {exampleDialogues.map((dialogue: any) => (
                    <div key={dialogue.id} className="space-y-2">
                      <p className="text-label-medium text-on-surface-variant">
                        {dialogue.situation}
                      </p>
                      <div className="pl-4 border-l-2 border-primary">
                        <p className="text-body-medium">{dialogue.response}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Author Comments */}
            {authorComments && (
              <div className="mb-6">
                <h3 className="text-title-medium mb-2">작성자 코멘트</h3>
                <p className="text-body-medium text-on-surface-variant whitespace-pre-wrap">
                  {authorComments}
                </p>
              </div>
            )}

            {/* CTA Button */}
            {user ? (
              <button
                onClick={() => setShowCreationModal(true)}
                disabled={createChatMutation.isPending || cloneChatMutation.isPending}
                className="w-full glow-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createChatMutation.isPending || cloneChatMutation.isPending
                  ? 'Processing...'
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

      {/* Modals */}
      {user && character && (
        <>
          <ChatRoomCreationModal
            isOpen={showCreationModal}
            onClose={() => setShowCreationModal(false)}
            characterId={characterId}
            characterName={character.name}
            hasExistingRoom={!!recentRoomData}
            onOptionSelected={handleOptionSelected}
          />

          <PersonaSelectionModal
            isOpen={showPersonaModal}
            onClose={() => {
              setShowPersonaModal(false);
              setCreationOption(undefined);
            }}
            characterId={characterId}
            characterName={character.name}
            universeId={character.universeId}
            onComplete={handlePersonaComplete}
          />
        </>
      )}
    </div>
  );
}
