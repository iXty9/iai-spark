
import { useState, useEffect } from 'react';
import { logger } from '@/utils/logging';

export const useDebugMode = () => {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  useEffect(() => {
    // Check URL parameters for debug mode
    const checkDebugMode = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const debugParam = urlParams.get('debug');
      const isDebug = debugParam === 'true' || debugParam === '1';
      
      setIsDebugMode(isDebug);
      
      if (isDebug) {
        logger.info('Debug mode activated', { module: 'debug' });
      }
    };

    checkDebugMode();

    // Listen for URL changes
    const handlePopState = () => {
      checkDebugMode();
    };

    window.addEventListener('popstate', handlePopState);
    
    // Keyboard shortcut for debug mode (Ctrl+Shift+D)
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setShowDebugPanel(prev => !prev);
        logger.info('Debug panel toggled via keyboard shortcut', { module: 'debug' });
      }
    };

    document.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  const toggleDebugPanel = () => {
    setShowDebugPanel(prev => !prev);
  };

  const enableDebugMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('debug', 'true');
    window.history.pushState({}, '', url.toString());
    setIsDebugMode(true);
    setShowDebugPanel(true);
  };

  const disableDebugMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('debug');
    window.history.pushState({}, '', url.toString());
    setIsDebugMode(false);
    setShowDebugPanel(false);
  };

  return {
    isDebugMode,
    showDebugPanel,
    toggleDebugPanel,
    enableDebugMode,
    disableDebugMode
  };
};
