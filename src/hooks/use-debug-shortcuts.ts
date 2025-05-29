
import { useEffect } from 'react';
import { useDevMode } from '@/store/use-dev-mode';

export const useDebugShortcuts = () => {
  const { toggleDevMode } = useDevMode();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+D to toggle debug panel
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        toggleDevMode();
      }
    };

    // Only add in development
    if (process.env.NODE_ENV === 'development') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [toggleDevMode]);
};
