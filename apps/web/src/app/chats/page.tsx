'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TopNav } from '@/components/layout/TopNav';
import { ChatRoomCard } from '@/components/chat/ChatRoomCard';
import { chatRoomClient } from '@/lib/connectrpc/client';
import Link from 'next/link';
import { isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function ChatsPage() {
  const queryClient = useQueryClient();

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

  const deleteMutation = useMutation({
    mutationFn: async (roomId: string) => {
      await chatRoomClient.deleteChatRoom({ id: roomId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      toast.success('채팅방이 삭제되었습니다');
    },
    onError: (error: any) => {
      toast.error(error?.message || '채팅방 삭제에 실패했습니다');
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ roomId, isPinned }: { roomId: string; isPinned: boolean }) => {
      await chatRoomClient.updateChatRoom({
        id: roomId,
        isPinned: !isPinned,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      toast.success('고정 상태가 변경되었습니다');
    },
    onError: (error: any) => {
      toast.error(error?.message || '고정 상태 변경에 실패했습니다');
    },
  });

  const updateTitleMutation = useMutation({
    mutationFn: async ({ roomId, title }: { roomId: string; title: string }) => {
      await chatRoomClient.updateChatRoom({
        id: roomId,
        title: title,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      toast.success('제목이 변경되었습니다');
    },
    onError: (error: any) => {
      toast.error(error?.message || '제목 변경에 실패했습니다');
    },
  });

  const chatRooms = chatRoomsData?.chatRooms || [];

  const pinnedRooms = chatRooms.filter((room) => room.isPinned);
  const unpinnedRooms = chatRooms.filter((room) => !room.isPinned);

  // Group unpinned rooms by date
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

    unpinnedRooms.forEach((room) => {
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
                name: room.characterName || 'Unknown',
                imageUrl: room.characterImageUrl,
              }}
              title={room.title}
              lastMessage={room.lastMessage?.content}
              lastMessageAt={room.lastMessageAt}
              messageCount={room.messageCount}
              isPinned={room.isPinned}
              onDelete={() => deleteMutation.mutate(room.id)}
              onPinToggle={(roomId, isPinned) =>
                togglePinMutation.mutate({ roomId, isPinned })
              }
              onEditTitle={(roomId, title) =>
                updateTitleMutation.mutate({ roomId, title })
              }
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <main className="max-w-5xl mx-auto px-container-padding py-8 pb-32 lg:pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display-small font-display mb-2">My Chats</h1>
          <p className="text-body-large text-on-surface-variant">
            AI 캐릭터와의 대화를 이어가세요.
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
                아직 대화가 없습니다.
              </h2>
              <p className="text-body-large text-on-surface-variant mb-6">
                대화 목록 조회를 위해서는 캐릭터와의 대화 기록이 있어야 합니다.
              </p>
              <Link href="/" className="glow-button inline-block">
                캐릭터 탐색
              </Link>
            </div>
          </div>
        )}

        {/* Chat Rooms List */}
        {!isLoading && chatRooms.length > 0 && (
          <div>
            <DateSection title="고정됨" rooms={pinnedRooms} />
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
