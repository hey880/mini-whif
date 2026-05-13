'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { chatRoomClient } from '@/lib/connectrpc/client';
import { TopNav } from '@/components/layout/TopNav';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { useSSEChat } from '@/hooks/useSSEChat';
import { useChatStore } from '@/stores/chatStore';
import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '@/lib/utils';
import { toast, Toaster } from 'sonner';
import { supabase } from '@/lib/supabase';
import { CharacterDetailModal } from '@/components/character/CharacterDetailModal';
import { BookmarkPanel } from '@/components/chat/BookmarkPanel';
import { EditMessageModal } from '@/components/chat/EditMessageModal';
import { ContinueModal } from '@/components/chat/ContinueModal';
import { Bookmark } from 'lucide-react';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const roomId = params?.roomId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const lastMessageCountRef = useRef(0);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [isBookmarkPanelOpen, setIsBookmarkPanelOpen] = useState(false);
  const [bookmarkedMessageIds, setBookmarkedMessageIds] = useState<Set<string>>(new Set());
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string; role: 'user' | 'assistant' } | null>(null);
  const [isContinueModalOpen, setIsContinueModalOpen] = useState(false);

  const { isStreaming, streamingContent } = useChatStore();
  const { sendMessage } = useSSEChat();

  // Fetch chat room
  const { data: room, isLoading: loadingRoom } = useQuery({
    queryKey: ['chatRoom', roomId],
    queryFn: async () => {
      const response = await chatRoomClient.getChatRoom({ id: roomId });
      return response.chatRoom;
    },
    enabled: !!roomId,
  });

  // Fetch messages
  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', roomId],
    queryFn: async () => {
      const response = await chatRoomClient.listMessages({
        roomId,
        limit: 100,
        offset: 0,
      });
      return response;
    },
    enabled: !!roomId,
    refetchInterval: isStreaming ? false : 5000, // Refetch every 5s when not streaming
  });

  // Initialize bookmarks from message metadata
  useEffect(() => {
    if (messagesData?.messages) {
      const bookmarkedIds = new Set<string>();
      messagesData.messages.forEach((msg: any) => {
        try {
          // Parse metadataJson if it exists
          const metadata = msg.metadataJson ? JSON.parse(msg.metadataJson) : null;
          if (metadata?.isBookmarked) {
            bookmarkedIds.add(msg.id);
          }
        } catch (e) {
          console.error('Failed to parse metadata:', e);
        }
      });
      setBookmarkedMessageIds(bookmarkedIds);
    }
  }, [messagesData?.messages]);

  // Fetch gem wallet
  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      // Get access token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${apiUrl}/mypage/wallet`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch wallet');
      }

      return response.json();
    },
  });

  // Fetch user's current model to get gem cost
  const { data: currentModelData } = useQuery({
    queryKey: ['currentModel'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/mypage/profile`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      return data.data;
    },
  });

  // Check if user is near bottom of scroll
  const checkScrollPosition = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Show scroll button if not at bottom (with 100px threshold)
    setShowScrollButton(distanceFromBottom > 100);

    // Auto-scroll only if user is near bottom (within 200px)
    setShouldAutoScroll(distanceFromBottom < 200);
  };

  // Handle scroll events
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollPosition);

    // Initial check after messages load and render
    const checkInitial = setTimeout(() => {
      checkScrollPosition();
    }, 300);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      clearTimeout(checkInitial);
    };
  }, []);

  // Initial scroll to bottom on page load
  useEffect(() => {
    if (messagesData?.messages && messagesData.messages.length > 0 && lastMessageCountRef.current === 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        // Check scroll position after initial scroll
        setTimeout(() => checkScrollPosition(), 100);
      }, 100);
    }
  }, [messagesData?.messages]);

  // Check scroll position when messages change
  useEffect(() => {
    if (messagesData?.messages) {
      setTimeout(() => checkScrollPosition(), 200);
    }
  }, [messagesData?.messages?.length]);

  // Auto-scroll to bottom only when new messages arrive AND user is near bottom
  useEffect(() => {
    const currentMessageCount = messagesData?.messages?.length || 0;
    const hasNewMessages = currentMessageCount > lastMessageCountRef.current;

    // Only scroll if:
    // 1. There are actually new messages (not just a refetch), OR
    // 2. Content is streaming
    if (shouldAutoScroll && (hasNewMessages || streamingContent)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    // Update last message count
    lastMessageCountRef.current = currentMessageCount;
  }, [messagesData?.messages?.length, streamingContent, shouldAutoScroll]);

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShouldAutoScroll(true);
  };

  const handleSendMessage = async (message: string) => {
    try {
      // 메시지 전송 전에 스크롤을 최하단으로
      setShouldAutoScroll(true);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      await sendMessage(roomId, message);
    } catch (error: any) {
      console.error('Failed to send message:', error);

      // Special handling for gem shortage
      if (error.message?.includes('Insufficient gems')) {
        toast.error('젬이 부족합니다', {
          description: '젬을 충전하고 다시 시도해주세요',
          action: {
            label: '충전하기',
            onClick: () => router.push('/mypage?tab=gems'),
          },
        });
      } else {
        toast.error('메시지 전송 실패', {
          description: error.message || '다시 시도해주세요',
        });
      }
    }
  };

  const handleContinue = async (hint?: string) => {
    try {
      setShouldAutoScroll(true);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Send hint to trigger AI continuation (no user message)
      await sendMessage(roomId, '', hint);
    } catch (error: any) {
      console.error('Failed to continue:', error);
      toast.error('자동진행 실패', {
        description: error.message || '다시 시도해주세요',
      });
    }
  };

  const handleOpenEditModal = (messageId: string) => {
    const message = messagesData?.messages.find((m: any) => m.id === messageId);
    if (message) {
      setEditingMessage({
        id: message.id,
        content: message.content,
        role: message.role as 'user' | 'assistant',
      });
    }
  };

  const handleSaveEdit = async (content: string) => {
    if (!editingMessage) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${apiUrl}/messages/${editingMessage.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update message');
      }

      toast.success('메시지가 수정되었습니다');
      setEditingMessage(null);

      // Refetch messages
      queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
    } catch (error: any) {
      console.error('Failed to edit message:', error);
      toast.error('메시지 수정 실패', {
        description: error.message || '다시 시도해주세요',
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('이 메시지를 삭제하시겠습니까? 사용자 메시지인 경우 다음 AI 응답도 함께 삭제됩니다.')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${apiUrl}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete message');
      }

      toast.success('메시지가 삭제되었습니다');

      // Refetch messages
      queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      toast.error('메시지 삭제 실패', {
        description: error.message || '다시 시도해주세요',
      });
    }
  };

  const handleToggleBookmark = async (messageId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${apiUrl}/messages/${messageId}/bookmark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle bookmark');
      }

      const result = await response.json();

      setBookmarkedMessageIds((prev) => {
        const newSet = new Set(prev);
        if (result.isBookmarked) {
          newSet.add(messageId);
          toast.success('북마크 추가');
        } else {
          newSet.delete(messageId);
          toast.success('북마크 해제');
        }
        return newSet;
      });
    } catch (error: any) {
      console.error('Failed to toggle bookmark:', error);
      toast.error('북마크 실패', {
        description: error.message || '다시 시도해주세요',
      });
    }
  };

  const handleReaction = async (messageId: string, positive: boolean) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${apiUrl}/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPositive: positive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send feedback');
      }

      toast.success(positive ? '좋아요!' : '피드백 감사합니다');
    } catch (error: any) {
      console.error('Failed to send reaction:', error);
      toast.error('피드백 전송 실패', {
        description: error.message || '다시 시도해주세요',
      });
    }
  };

  const handleRegenerate = async (messageId: string, modelCost: number) => {
    // 1. Confirmation dialog
    const confirmed = window.confirm(
      `이 메시지를 재생성하시겠습니까? ${modelCost} Gem이 차감됩니다.`
    );
    if (!confirmed) return;

    const { setStreaming, appendStreamChunk, resetStream } = useChatStore.getState();

    try {
      // 2. Initialize streaming state
      setStreaming(true);
      resetStream();
      setShouldAutoScroll(true);

      // 3. Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      // 4. SSE request
      const response = await fetch(`${apiUrl}/messages/${messageId}/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to regenerate');
        } else {
          const text = await response.text();
          throw new Error(text || `Server error: ${response.status}`);
        }
      }

      // 5. SSE stream processing
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              appendStreamChunk(data.content);

              if (data.is_final_event) {
                setStreaming(false);

                // 6. Refresh data
                queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
                queryClient.invalidateQueries({ queryKey: ['wallet'] });

                toast.success('메시지가 재생성되었습니다');
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (error: any) {
      setStreaming(false);

      // 7. Error handling
      if (error.message?.includes('Insufficient gems')) {
        toast.error('젬이 부족합니다', {
          description: '젬을 충전하고 다시 시도해주세요',
          action: {
            label: '충전하기',
            onClick: () => router.push('/mypage?tab=gems'),
          },
        });
      } else {
        toast.error('재생성 실패', {
          description: error.message || '다시 시도해주세요',
        });
      }
    }
  };

  const handleScrollToMessage = (messageId: string) => {
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight effect
      messageElement.classList.add('ring-2', 'ring-primary');
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-primary');
      }, 2000);
    }
    setIsBookmarkPanelOpen(false);
  };

  if (loadingRoom || loadingMessages) {
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

  if (!room) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">
              error
            </span>
            <p className="text-title-large text-on-surface-variant">
              Chat room not found
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalGems = walletData?.data?.totalGems || 0;
  const userName = room.persona?.name || '사용자';
  const modelCost = currentModelData?.chosenLlmModel?.gemCostPerMessage || 10; // Default to 10 if not found

  return (
    <div className="h-screen bg-background flex flex-col">
      <Toaster position="top-center" />
      <TopNav />

      {/* Chat Header */}
      <div className="glass-panel border-b border-outline-variant/30 px-container-padding py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Character Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/chats')}
              className="p-2 hover:bg-surface-container-high rounded-lg transition-colors"
              title="채팅 목록으로"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>

            <button
              onClick={() => setIsCharacterModalOpen(true)}
              className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer"
              title="캐릭터 상세 정보"
            >
              {room.character?.imageUrl ? (
                <img
                  src={room.character.imageUrl}
                  alt={room.character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-primary">
                  smart_toy
                </span>
              )}
            </button>

            <div>
              <button
                onClick={() => setIsCharacterModalOpen(true)}
                className="text-left hover:text-primary transition-colors"
              >
                <h2 className="text-title-medium font-medium">
                  {room.character?.name || 'Unknown'}
                </h2>
              </button>
              {room.persona && (
                <p className="text-label-small text-on-surface-variant">
                  As {room.persona.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bookmark Button */}
            <button
              onClick={() => setIsBookmarkPanelOpen(true)}
              className="p-2 rounded-lg hover:bg-surface-container-high transition-colors relative"
              title="북마크"
            >
              <Bookmark className="w-5 h-5" />
              {bookmarkedMessageIds.size > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-on-primary text-xs flex items-center justify-center">
                  {bookmarkedMessageIds.size}
                </span>
              )}
            </button>

            {/* Gem Balance */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-high">
              <span className="material-symbols-filled text-primary">
                diamond
              </span>
              <span className="text-title-medium font-medium">
                {formatNumber(totalGems)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
        <div className="max-w-5xl mx-auto px-container-padding py-6 space-y-4">
          {messagesData?.messages.map((message: any) => (
            <div
              key={message.id}
              ref={(el) => {
                if (el) {
                  messageRefs.current.set(message.id, el);
                } else {
                  messageRefs.current.delete(message.id);
                }
              }}
              className="transition-all"
            >
              <MessageBubble
                messageId={message.id}
                role={message.role as 'user' | 'assistant'}
                content={message.content}
                timestamp={message.createdAt}
                characterName={room.character?.name}
                characterImageUrl={room.character?.imageUrl}
                userName={userName}
                isBookmarked={bookmarkedMessageIds.has(message.id)}
                userReaction={message.userReaction}
                triggeredImages={message.triggeredImages}
                modelCost={modelCost}
                onCharacterAvatarClick={() => setIsCharacterModalOpen(true)}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteMessage}
                onBookmark={handleToggleBookmark}
                onReaction={handleReaction}
                onRegenerate={handleRegenerate}
              />
            </div>
          ))}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <MessageBubble
              messageId="streaming"
              role="assistant"
              content={streamingContent}
              timestamp={new Date().toISOString()}
              characterName={room.character?.name}
              characterImageUrl={room.character?.imageUrl}
              userName={userName}
              onCharacterAvatarClick={() => setIsCharacterModalOpen(true)}
            />
          )}

          {/* Typing indicator */}
          {isStreaming && !streamingContent && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 left-4 lg:left-8 lg:bottom-28 p-3 rounded-full bg-primary text-on-primary shadow-lg hover:bg-primary-container transition-all hover:scale-110 z-50"
            title="최하단으로 스크롤"
          >
            <span className="material-symbols-filled">arrow_downward</span>
          </button>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-outline-variant/30">
        <div className="max-w-5xl mx-auto px-container-padding py-4">
          <ChatInput
            onSend={handleSendMessage}
            onSendEmpty={() => setIsContinueModalOpen(true)}
            disabled={isStreaming}
            placeholder={
              isStreaming
                ? 'Waiting for response...'
                : `Message ${room.character?.name || 'character'}...`
            }
          />
        </div>
      </div>

      {/* Character Detail Modal */}
      {room.character && (
        <CharacterDetailModal
          characterId={room.character.id}
          isOpen={isCharacterModalOpen}
          onClose={() => setIsCharacterModalOpen(false)}
        />
      )}

      {/* Bookmark Panel */}
      <BookmarkPanel
        isOpen={isBookmarkPanelOpen}
        onClose={() => {
          setIsBookmarkPanelOpen(false);
          setSelectedBookmarkId(null);
        }}
        bookmarkedMessages={
          messagesData?.messages
            .filter((msg: any) => bookmarkedMessageIds.has(msg.id))
            .map((msg: any) => ({
              id: msg.id,
              content: msg.content,
              timestamp: msg.createdAt,
              role: msg.role,
            })) || []
        }
        onScrollToMessage={handleScrollToMessage}
        selectedMessageId={selectedBookmarkId}
        onSelectMessage={setSelectedBookmarkId}
      />

      {/* Edit Message Modal */}
      {editingMessage && (
        <EditMessageModal
          isOpen={true}
          onClose={() => setEditingMessage(null)}
          initialContent={editingMessage.content}
          onSave={handleSaveEdit}
          role={editingMessage.role}
        />
      )}

      {/* Continue Modal */}
      <ContinueModal
        isOpen={isContinueModalOpen}
        onClose={() => setIsContinueModalOpen(false)}
        onContinue={(hint) => {
          handleContinue(hint);
          setIsContinueModalOpen(false);
        }}
        gemCost={10}
      />
    </div>
  );
}
