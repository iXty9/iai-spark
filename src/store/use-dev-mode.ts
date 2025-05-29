
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DevModeState {
  isDevMode: boolean;
  toggleDevMode: () => void;
}

export const useDevMode = create<DevModeState>()(
  persist(
    (set) => ({
      isDevMode: false,
      toggleDevMode: () => set((state) => {
        const newState = { isDevMode: !state.isDevMode };
        
        // Dispatch event to notify our debug systems
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('devModeChanged', { 
            detail: newState 
          }));
          
          // Add a delay to allow React to stabilize before applying changes
          setTimeout(() => {
            console.log('Dev Mode changed:', newState.isDevMode);
          }, 0);
        }
        
        return newState;
      }),
    }),
    {
      name: 'dev-mode-storage',
      partialize: (state) => ({ isDevMode: state.isDevMode }),
    }
  )
);
