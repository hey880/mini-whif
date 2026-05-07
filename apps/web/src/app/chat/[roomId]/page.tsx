'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { chatRoomClient } from '@/lib/connectrpc/client';
import { TopNav } from '@/components/layout/TopNav';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { useSSEChat } from '@/hooks/useSSEChat';
import { useChatStore } from '@/stores/chatStore';
import { useEffect, useRef } from 'react';
import { formatNumber } from '@/lib/utils';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Fetch gem wallet
  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/mypage/wallet`, {
        credentials: 'include',
      });
      return response.json();
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages, streamingContent]);

  const handleSendMessage = async (message: string) => {
    try {
      await sendMessage(roomId, message);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
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

  return (
    <div className="h-screen bg-background flex flex-col">
      <TopNav />

      {/* Chat Header */}
      <div className="glass-panel border-b border-outline-variant/30 px-container-padding py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Character Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-surface-container-high rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>

            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden">
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
            </div>

            <div>
              <h2 className="text-title-medium font-medium">
                {room.character?.name || 'Unknown'}
              </h2>
              {room.persona && (
                <p className="text-label-small text-on-surface-variant">
                  As {room.persona.name}
                </p>
              )}
            </div>
          </div>

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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto px-container-padding py-6 space-y-4">
          {messagesData?.messages.map((message: { id: string; role: string; content: string; createdAt: string }) => (
            <MessageBubble
              key={message.id}
              role={message.role as 'user' | 'assistant'}
              content={message.content}
              timestamp={message.createdAt}
              characterName={room.character?.name}
              characterImageUrl={room.character?.imageUrl}
            />
          ))}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <MessageBubble
              role="assistant"
              content={streamingContent}
              timestamp={new Date().toISOString()}
              characterName={room.character?.name}
              characterImageUrl={room.character?.imageUrl}
            />
          )}

          {/* Typing indicator */}
          {isStreaming && !streamingContent && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-outline-variant/30">
        <div className="max-w-5xl mx-auto px-container-padding py-4">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isStreaming}
            placeholder={
              isStreaming
                ? 'Waiting for response...'
                : `Message ${room.character?.name || 'character'}...`
            }
          />
        </div>
      </div>
    </div>
  );
}
