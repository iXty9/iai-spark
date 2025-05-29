
import { useState, useCallback } from 'react';
import { emitDebugEvent } from '@/utils/debug-events';

export const useChatState = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasLoadedAuth, setHasLoadedAuth] = useState(false);

  const handleAuthLoaded = useCallback(() => {
    if (!hasLoadedAuth) {
      setHasLoadedAuth(true);
      console.log('Chat auth state loaded');
      emitDebugEvent({
        lastAction: 'Auth state loaded'
      });
    }
  }, [hasLoadedAuth]);

  return {
    isTransitioning,
    hasLoadedAuth,
    handleAuthLoaded
  };
};
