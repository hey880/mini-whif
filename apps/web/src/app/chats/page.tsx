'use client';

import { useQuery } from '@tanstack/react-query';
import { TopNav } from '@/components/layout/TopNav';
import { ChatRoomCard } from '@/components/chat/ChatRoomCard';
import { chatRoomClient } from '@/lib/connectrpc/client';
import Link from 'next/link';
import { isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';

export default function ChatsPage() {
  const { data: chatRoomsData, isLoading } = useQuery({
    queryKey: ['chatRooms'],
    queryFn: async () => {
      const response = await chatRoomClient.listChatRooms({
        limit: 50,
        offset: 0,
      });
      return response;
    },
  });

  const chatRooms = chatRoomsData?.chatRooms || [];

  // Group chat rooms by date
  const groupChatRoomsByDate = () => {
    const groups: {
      today: typeof chatRooms;
      yesterday: typeof chatRooms;
      thisWeek: typeof chatRooms;
      older: typeof chatRooms;
    } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    chatRooms.forEach((room) => {
      if (!room.lastMessageAt) {
        groups.older.push(room);
        return;
      }

      const date = parseISO(room.lastMessageAt);

      if (isToday(date)) {
        groups.today.push(room);
      } else if (isYesterday(date)) {
        groups.yesterday.push(room);
      } else if (isThisWeek(date)) {
        groups.thisWeek.push(room);
      } else {
        groups.older.push(room);
      }
    });

    return groups;
  };

  const groupedRooms = groupChatRoomsByDate();

  const DateSection = ({
    title,
    rooms,
  }: {
    title: string;
    rooms: typeof chatRooms;
  }) => {
    if (rooms.length === 0) return null;

    return (
      <div className="mb-6">
        <h2 className="text-title-medium font-medium text-on-surface-variant mb-3 px-2">
          {title}
        </h2>
        <div className="space-y-2">
          {rooms.map((room) => (
            <ChatRoomCard
              key={room.id}
              roomId={room.id}
              character={{
                name: room.character?.name || 'Unknown',
                imageUrl: room.character?.imageUrl,
              }}
              lastMessage={room.lastMessage?.content}
              lastMessageAt={room.lastMessageAt}
              messageCount={room.messageCount}
              isPinned={room.isPinned}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <main className="max-w-5xl mx-auto px-container-padding py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display-small font-display mb-2">My Chats</h1>
          <p className="text-body-large text-on-surface-variant">
            Continue your conversations with AI characters
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && chatRooms.length === 0 && (
          <div className="glass-card p-12 text-center">
            <div className="max-w-md mx-auto">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
                chat_bubble
              </span>
              <h2 className="text-headline-medium font-headline mb-2">
                No conversations yet
              </h2>
              <p className="text-body-large text-on-surface-variant mb-6">
                Start a conversation with a character to see your chat history here
              </p>
              <Link href="/" className="glow-button inline-block">
                Explore Characters
              </Link>
            </div>
          </div>
        )}

        {/* Chat Rooms List */}
        {!isLoading && chatRooms.length > 0 && (
          <div>
            <DateSection title="Today" rooms={groupedRooms.today} />
            <DateSection title="Yesterday" rooms={groupedRooms.yesterday} />
            <DateSection title="This Week" rooms={groupedRooms.thisWeek} />
            <DateSection title="Older" rooms={groupedRooms.older} />
          </div>
        )}
      </main>
    </div>
  );
}
