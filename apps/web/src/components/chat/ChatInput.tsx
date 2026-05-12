'use client';

import { useState, KeyboardEvent, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onSendEmpty?: () => void;
  disabled?: boolean;
  placeholder?: string;
  gemCost?: number;
}

export function ChatInput({
  onSend,
  onSendEmpty,
  disabled = false,
  placeholder = 'Type your message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (disabled) return;

    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
    } else {
      // Trigger continue modal
      onSendEmpty?.();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertFormat = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);

    const newText =
      message.substring(0, start) +
      prefix + selectedText + suffix +
      message.substring(end);

    setMessage(newText);

    // Move cursor to the middle of inserted format
    setTimeout(() => {
      const newPosition = start + prefix.length + selectedText.length;
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  return (
    <div className="glass-panel p-4 focus-within:ring-2 focus-within:ring-primary transition-all">
        <div className="flex gap-3">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant resize-none outline-none max-h-32"
            style={{
              minHeight: '24px',
              height: 'auto',
            }}
            onInput={(e) => {
              e.currentTarget.style.height = 'auto';
              e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
            }}
          />

          <button
            onClick={handleSend}
            disabled={disabled}
            className="self-end p-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title={!message.trim() ? '계속하기 (빈 메시지 전송)' : '전송'}
          >
            {!message.trim() ? (
              <Sparkles className="w-5 h-5" />
            ) : (
              <span className="material-symbols-filled">send</span>
            )}
          </button>
        </div>

      {/* Format Buttons */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-2">
          <button
            onClick={() => insertFormat('"', '"')}
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-50 transition-colors text-label-medium font-medium"
            title="대사 추가 (큰따옴표)"
          >
            대사 추가 (큰따옴표  &quot; &quot;)
          </button>
          <button
            onClick={() => insertFormat('*', '*')}
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-50 transition-colors text-label-medium font-medium"
            title="행동 추가 (별표)"
          >
            행동 추가 (별표 * *)
          </button>
        </div>

        <div className="text-label-small text-on-surface-variant">
          Enter: 전송 · Shift+Enter: 줄바꿈
        </div>
      </div>
    </div>
  );
}
