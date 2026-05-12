'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Pin, Edit2, Trash2 } from 'lucide-react';

interface ChatRoomCardProps {
  roomId: string;
  character: {
    name: string;
    imageUrl?: string;
  };
  title?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  messageCount: number;
  isPinned?: boolean;
  onDelete?: () => void;
  onPinToggle?: (roomId: string, isPinned: boolean) => void;
  onEditTitle?: (roomId: string, newTitle: string) => void;
}

export function ChatRoomCard({
  roomId,
  character,
  title,
  lastMessage,
  lastMessageAt,
  messageCount,
  isPinned = false,
  onDelete,
  onPinToggle,
  onEditTitle,
}: ChatRoomCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditTitle, setShowEditTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(title || character.name);
  const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom');
  const menuRef = useRef<HTMLDivElement>(null);

  const timeAgo = lastMessageAt
    ? formatDistanceToNow(new Date(lastMessageAt), { addSuffix: true })
    : 'No messages';

  const displayTitle = title || character.name;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Calculate menu position to prevent overflow
  useEffect(() => {
    if (showMenu && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const menuHeight = 160; // Approximate height of menu (3 items * ~50px)
      const spaceBelow = window.innerHeight - rect.bottom;

      // If not enough space below, open upward
      if (spaceBelow < menuHeight) {
        setMenuPosition('top');
      } else {
        setMenuPosition('bottom');
      }
    }
  }, [showMenu]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handlePinToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPinToggle?.(roomId, isPinned);
    setShowMenu(false);
  };

  const handleEditTitleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    setEditingTitle(title || character.name);
    setShowEditTitle(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.();
    setShowDeleteConfirm(false);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const handleSaveTitle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEditTitle?.(roomId, editingTitle);
    setShowEditTitle(false);
  };

  const handleCancelEditTitle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowEditTitle(false);
  };

  return (
    <div className="relative">
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
                <Pin className="w-3 h-3 text-on-primary fill-on-primary" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-title-medium font-medium truncate group-hover:text-primary transition-colors">
                {displayTitle}
              </h3>
              <span className="text-label-small text-on-surface-variant flex-shrink-0 ml-2">
                {timeAgo}
              </span>
            </div>
            {title && title !== character.name && (
              <p className="text-label-small text-on-surface-variant/70 mb-0.5">
                {character.name}
              </p>
            )}
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

          {/* Three-dot Menu Button */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={handleMenuClick}
              className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-container"
              aria-label="메뉴"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div
                className={`absolute right-0 w-48 glass-card py-1 shadow-lg z-50 ${
                  menuPosition === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
                }`}
              >
                <button
                  onClick={handlePinToggle}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-surface-container transition-colors text-left"
                >
                  <Pin className="w-4 h-4" />
                  <span>{isPinned ? '고정 해제' : '고정'}</span>
                </button>
                {onEditTitle && (
                  <button
                    onClick={handleEditTitleClick}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-surface-container transition-colors text-left"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>제목 수정</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDeleteClick}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-error-container text-error transition-colors text-left"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>삭제</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Edit Title Modal */}
      {showEditTitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-title-large mb-4">채팅방 제목 수정</h3>
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:outline-none transition-colors mb-2"
              placeholder="채팅방 제목"
              autoFocus
            />
            <p className="text-label-small text-on-surface-variant mb-6">
              {editingTitle.length} / 100자
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelEditTitle}
                className="px-6 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveTitle}
                className="px-6 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-title-large mb-2">채팅방 삭제</h3>
            <p className="text-body-medium text-on-surface-variant mb-6">
              <strong>{displayTitle}</strong> 채팅방을 삭제하시겠습니까? 모든 대화 내역이 삭제되며 복구할 수 없습니다.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-6 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-3 rounded-xl bg-error text-on-error hover:bg-error/90 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
