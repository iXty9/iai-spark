
import { create } from 'zustand';

interface DevModeState {
  isDevMode: boolean;
  toggleDevMode: () => void;
}

export const useDevMode = create<DevModeState>((set) => ({
  isDevMode: false,
  toggleDevMode: () => set((state) => ({ isDevMode: !state.isDevMode })),
}));
