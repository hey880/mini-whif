import { create } from 'zustand';

interface UIState {
  isAnnouncementOpen: boolean;
  isVersionModalOpen: boolean;
  versionModalMessageId: string | null;
  setAnnouncementOpen: (isOpen: boolean) => void;
  openVersionModal: (messageId: string) => void;
  closeVersionModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAnnouncementOpen: true,
  isVersionModalOpen: false,
  versionModalMessageId: null,
  setAnnouncementOpen: (isAnnouncementOpen) => set({ isAnnouncementOpen }),
  openVersionModal: (messageId) =>
    set({ isVersionModalOpen: true, versionModalMessageId: messageId }),
  closeVersionModal: () =>
    set({ isVersionModalOpen: false, versionModalMessageId: null }),
}));
