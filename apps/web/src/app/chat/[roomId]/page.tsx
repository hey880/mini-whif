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
import { RerollConfirmModal } from '@/components/chat/RerollConfirmModal';
import { MemoryStorageModal } from '@/components/chat/MemoryStorageModal';
import { UserNoteModal } from '@/components/chat/UserNoteModal';
import { Menu, Bookmark, NotebookPen, Brain } from 'lucide-react';

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
  const [rerollModalOpen, setRerollModalOpen] = useState(false);
  const [pendingReroll, setPendingReroll] = useState<{ messageId: string; modelCost: number } | null>(null);
  const [isHamburgerMenuOpen, setIsHamburgerMenuOpen] = useState(false);
  const [isMemoryStorageModalOpen, setIsMemoryStorageModalOpen] = useState(false);
  const [isUserNoteModalOpen, setIsUserNoteModalOpen] = useState(false);
  const [isSummarizingMessages, setIsSummarizingMessages] = useState(false);

  const { isStreaming, streamingContent, optimisticUserMessage } = useChatStore();
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
    if (!confirm('이 메시지를 삭제하시겠습니까? 이 메시지 이후의 모든 대화가 함께 삭제됩니다.')) {
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

  const handleGenerateSummary = async () => {
    setIsSummarizingMessages(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${apiUrl}/chat-rooms/${roomId}/summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 402) {
          toast.error('Gem이 부족합니다', {
            description: `필요: ${error.required} Gem, 보유: ${error.available} Gem`,
            action: {
              label: '충전하기',
              onClick: () => router.push('/gem-shop'),
            },
          });
          return;
        }
        if (response.status === 400) {
          toast.error('메시지가 부족합니다', {
            description: `최소 ${error.required}개의 메시지가 필요합니다 (현재: ${error.current}개)`,
          });
          return;
        }
        throw new Error(error.error || 'Failed to generate summary');
      }

      const result = await response.json();
      toast.success('기억저장소가 생성되었습니다', {
        description: `${result.gemsDeducted} Gem이 차감되었습니다`,
      });

      // Refetch chat room to get updated summary
      queryClient.invalidateQueries({ queryKey: ['chatRoom', roomId] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });

      setIsMemoryStorageModalOpen(false);
    } catch (error: any) {
      console.error('Failed to generate summary:', error);
      toast.error('요약 생성 실패', {
        description: error.message || '다시 시도해주세요',
      });
    } finally {
      setIsSummarizingMessages(false);
    }
  };

  const handleReroll = (messageId: string, modelCost: number) => {
    // 모달 열기
    setPendingReroll({ messageId, modelCost });
    setRerollModalOpen(true);
  };

  const executeReroll = async (hint?: string) => {
    if (!pendingReroll) return;

    const { messageId, modelCost } = pendingReroll;
    const { setStreaming, appendStreamChunk, resetStream } = useChatStore.getState();

    try {
      // 1. Initialize streaming state
      setStreaming(true);
      resetStream();
      setShouldAutoScroll(true);

      // 2. Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      // 3. SSE request with optional hint
      const requestBody: { hint?: string } = {};
      if (hint && hint.trim()) {
        requestBody.hint = hint.trim();
      }

      const response = await fetch(`${apiUrl}/messages/${messageId}/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to reroll');
        } else {
          const text = await response.text();
          throw new Error(text || `Server error: ${response.status}`);
        }
      }

      // 4. SSE stream processing
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

              // Update streaming content immediately (React 19 batching handles optimization)
              appendStreamChunk(data.content);

              if (data.is_final_event) {
                setStreaming(false);
                toast.success('메시지가 재생성되었습니다');

                // 백엔드의 DB 업데이트(Gem 차감 등) 완료를 위해 짧은 지연 후 쿼리 무효화
                setTimeout(async () => {
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['messages', roomId] }),
                    queryClient.invalidateQueries({ queryKey: ['wallet'] }),
                  ]);
                }, 300);
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (error: any) {
      setStreaming(false);

      // 6. Error handling
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

  // Find the last AI message ID
  const lastAiMessageId = messagesData?.messages
    ? [...messagesData.messages]
        .reverse()
        .find((msg: any) => msg.role === 'assistant')?.id
    : null;

  // Find the first message ID (greeting message, should not be deletable)
  const firstMessageId = messagesData?.messages?.[0]?.id || null;

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
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsHamburgerMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
              title="메뉴"
            >
              <Menu className="w-5 h-5" />
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
          {/* Existing messages */}
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
                versionNumber={message.versionNumber || 1}
                modelCost={modelCost}
                isLastAiMessage={message.id === lastAiMessageId}
                isFirstMessage={message.id === firstMessageId}
                onCharacterAvatarClick={() => setIsCharacterModalOpen(true)}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteMessage}
                onBookmark={handleToggleBookmark}
                onReaction={handleReaction}
                onReroll={handleReroll}
              />
            </div>
          ))}

          {/* Optimistic user message (shown immediately) */}
          {optimisticUserMessage && (
            <MessageBubble
              messageId={optimisticUserMessage.id}
              role="user"
              content={optimisticUserMessage.content}
              timestamp={optimisticUserMessage.timestamp}
              characterName={room.character?.name}
              userName={userName}
            />
          )}

          {/* Streaming AI message */}
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

      {/* Reroll Confirm Modal */}
      <RerollConfirmModal
        isOpen={rerollModalOpen}
        onClose={() => {
          setRerollModalOpen(false);
          setPendingReroll(null);
        }}
        onConfirm={executeReroll}
        gemCost={pendingReroll?.modelCost || 10}
      />

      {/* Memory Storage Modal */}
      <MemoryStorageModal
        isOpen={isMemoryStorageModalOpen}
        onClose={() => setIsMemoryStorageModalOpen(false)}
        onGenerate={handleGenerateSummary}
        currentSummary={room?.conversationSummary || null}
        messageCount={messagesData?.messages?.length || 0}
        isGenerating={isSummarizingMessages}
        gemCost={50}
      />

      {/* User Note Modal */}
      <UserNoteModal
        isOpen={isUserNoteModalOpen}
        onClose={() => setIsUserNoteModalOpen(false)}
        roomId={roomId}
        initialNote={room?.userNote || null}
        onSaveSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['chatRoom', roomId] });
        }}
      />

      {/* Side Menu */}
      {isHamburgerMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsHamburgerMenuOpen(false)}
          />

          {/* Side Panel */}
          <div className="fixed top-0 right-0 h-full w-80 bg-surface-container z-50 shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
              <h2 className="text-title-large font-bold">메뉴</h2>
              <button
                onClick={() => setIsHamburgerMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => {
                  setIsBookmarkPanelOpen(true);
                  setIsHamburgerMenuOpen(false);
                }}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-surface-container-high transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center">
                  <Bookmark className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-body-large font-medium text-on-surface">북마크 목록</div>
                  <div className="text-body-small text-on-surface-variant">저장된 메시지 보기</div>
                </div>
                {bookmarkedMessageIds.size > 0 && (
                  <span className="px-3 py-1 rounded-full bg-primary text-on-primary text-label-medium font-medium">
                    {bookmarkedMessageIds.size}
                  </span>
                )}
              </button>

              <div className="h-px bg-outline-variant mx-6 my-2" />

              <button
                onClick={() => {
                  setIsMemoryStorageModalOpen(true);
                  setIsHamburgerMenuOpen(false);
                }}
                disabled={(messagesData?.messages?.length || 0) < 40}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-surface-container-high transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-body-large font-medium text-on-surface">기억저장소</div>
                  {(messagesData?.messages?.length || 0) < 40 ? (
                    <div className="text-body-small text-error">
                      40개 메시지 필요 (현재: {messagesData?.messages?.length || 0}개)
                    </div>
                  ) : (
                    <div className="text-body-small text-on-surface-variant">대화 내용 AI 요약</div>
                  )}
                </div>
              </button>

              <div className="h-px bg-outline-variant mx-6 my-2" />

              <button
                onClick={() => {
                  setIsUserNoteModalOpen(true);
                  setIsHamburgerMenuOpen(false);
                }}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-surface-container-high transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center">
                  <NotebookPen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-body-large font-medium text-on-surface">유저노트</div>
                  <div className="text-body-small text-on-surface-variant">AI 지시사항 작성</div>
                </div>
              </button>
            </div>

            {/* Footer Info */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-outline-variant bg-surface-container-low">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-on-surface-variant">info</span>
                <span className="text-label-large text-on-surface-variant">기능 안내</span>
              </div>
              <div className="space-y-2 text-body-small text-on-surface-variant">
                <p>• 기억저장소: 50 Gem</p>
                <p>• 유저노트 확장: 5 Gem</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
