
import { create } from 'zustand';

interface DevModeState {
  isDevMode: boolean;
  toggleDevMode: () => void;
}

export const useDevMode = create<DevModeState>((set) => ({
  isDevMode: false,
  toggleDevMode: () => set((state) => {
    const newState = { isDevMode: !state.isDevMode };
    
    // Dispatch event to notify our debug systems
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('devModeChanged', { 
        detail: newState 
      }));
    }
    
    return newState;
  }),
}));
