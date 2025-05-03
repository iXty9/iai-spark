
import { useState, useCallback, useRef } from 'react';
import { emitDebugEvent } from '@/utils/debug-events';

export const useChatState = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasLoadedAuth, setHasLoadedAuth] = useState(false);

  const handleTransitionStart = useCallback(() => {
    console.log('Starting chat transition');
    setIsTransitioning(true);
    emitDebugEvent({
      lastAction: 'Chat transition started',
      isTransitioning: true
    });
  }, []);

  const handleTransitionEnd = useCallback(() => {
    console.log('Ending chat transition');
    setIsTransitioning(false);
    emitDebugEvent({
      lastAction: 'Chat transition completed',
      isTransitioning: false
    });
  }, []);

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
    handleTransitionStart,
    handleTransitionEnd,
    handleAuthLoaded
  };
};
