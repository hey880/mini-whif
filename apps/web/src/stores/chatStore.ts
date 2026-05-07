import { create } from 'zustand';

interface ChatState {
  currentRoomId: string | null;
  isStreaming: boolean;
  streamingContent: string;
  setCurrentRoom: (roomId: string | null) => void;
  setStreaming: (isStreaming: boolean) => void;
  appendStreamChunk: (chunk: string) => void;
  resetStream: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  currentRoomId: null,
  isStreaming: false,
  streamingContent: '',
  setCurrentRoom: (currentRoomId) => set({ currentRoomId }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  appendStreamChunk: (chunk) =>
    set((state) => ({ streamingContent: chunk })),
  resetStream: () => set({ streamingContent: '' }),
}));
