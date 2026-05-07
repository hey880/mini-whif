'use client';

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
        <span className="material-symbols-outlined text-primary">
          smart_toy
        </span>
      </div>

      {/* Typing animation */}
      <div className="ai-bubble">
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}
