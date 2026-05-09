'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

interface ChatRoomCardProps {
  roomId: string;
  character: {
    name: string;
    imageUrl?: string;
  };
  lastMessage?: string;
  lastMessageAt?: string;
  messageCount: number;
  isPinned?: boolean;
}

export function ChatRoomCard({
  roomId,
  character,
  lastMessage,
  lastMessageAt,
  messageCount,
  isPinned,
}: ChatRoomCardProps) {
  const timeAgo = lastMessageAt
    ? formatDistanceToNow(new Date(lastMessageAt), { addSuffix: true })
    : 'No messages';

  return (
    <Link href={`/chat/${roomId}`}>
      <div className="glass-card p-4 flex items-center gap-4 hover:bg-surface-container-high transition-all cursor-pointer group">
        {/* Character Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant/30">
            {character.imageUrl ? (
              <Image
                src={character.imageUrl}
                alt={character.name}
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-headline-medium text-on-surface-variant">
                {character.name[0]?.toUpperCase()}
              </div>
            )}
          </div>
          {isPinned && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-filled text-sm text-on-primary">
                push_pin
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-title-medium font-medium truncate group-hover:text-primary transition-colors">
              {character.name}
            </h3>
            <span className="text-label-small text-on-surface-variant flex-shrink-0 ml-2">
              {timeAgo}
            </span>
          </div>
          <p className="text-body-medium text-on-surface-variant truncate">
            {lastMessage || 'Start a conversation...'}
          </p>
        </div>

        {/* Message Count Badge */}
        {messageCount > 0 && (
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <div className="px-2 py-1 rounded-full bg-primary-container text-on-primary-container text-label-small font-medium">
              {messageCount}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
