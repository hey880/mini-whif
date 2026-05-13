'use client';

import { useQuery } from '@tanstack/react-query';
import { characterClient } from '@/lib/connectrpc/client';
import { X } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { RelatedContentCard } from './components/RelatedContentCard';
import { linkifyText } from '@/lib/linkify';
import { useEffect } from 'react';

interface CharacterDetailModalProps {
  characterId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CharacterDetailModal({
  characterId,
  isOpen,
  onClose,
}: CharacterDetailModalProps) {
  // Fetch character
  const { data: character, isLoading } = useQuery({
    queryKey: ['character', characterId],
    queryFn: async () => {
      const response = await characterClient.getCharacter({ id: characterId });
      return response.character;
    },
    enabled: isOpen && !!characterId,
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

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-background/80 backdrop-blur-md"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-6xl max-h-[90vh] mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors z-10"
          title="닫기"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="glass-card overflow-y-auto max-h-[90vh] custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="skeleton w-16 h-16 rounded-full mx-auto mb-4" />
                <div className="skeleton w-48 h-6 rounded mx-auto" />
              </div>
            </div>
          ) : !character ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">
                  error
                </span>
                <p className="text-title-large text-on-surface-variant">
                  Character not found
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 lg:p-8">
              {/* Character Image */}
              <div className="flex justify-center mb-8">
                <div className="w-full max-w-sm">
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

              {/* Character Info */}
              <div>
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
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
