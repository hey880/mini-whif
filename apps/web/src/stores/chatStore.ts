import { create } from 'zustand';

interface OptimisticMessage {
  id: string;
  content: string;
  timestamp: string;
}

interface ChatState {
  currentRoomId: string | null;
  isStreaming: boolean;
  streamingContent: string;
  optimisticUserMessage: OptimisticMessage | null;
  setCurrentRoom: (roomId: string | null) => void;
  setStreaming: (isStreaming: boolean) => void;
  appendStreamChunk: (chunk: string) => void;
  resetStream: () => void;
  setOptimisticUserMessage: (message: OptimisticMessage | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  currentRoomId: null,
  isStreaming: false,
  streamingContent: '',
  optimisticUserMessage: null,
  setCurrentRoom: (currentRoomId) => set({ currentRoomId }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  appendStreamChunk: (chunk) =>
    set((state) => ({ streamingContent: chunk })),
  resetStream: () => set({ streamingContent: '' }),
  setOptimisticUserMessage: (optimisticUserMessage) => set({ optimisticUserMessage }),
}));
