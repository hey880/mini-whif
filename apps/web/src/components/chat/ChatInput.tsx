'use client';

import { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass-panel p-4 focus-within:ring-2 focus-within:ring-primary transition-all">
      <div className="flex gap-3">
        <textarea
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
          disabled={disabled || !message.trim()}
          className="self-end p-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <span className="material-symbols-filled">send</span>
        </button>
      </div>

      <div className="mt-2 text-label-small text-on-surface-variant">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}
