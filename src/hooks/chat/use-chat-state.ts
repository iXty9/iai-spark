
import { useCallback, useRef } from 'react';
import { Message } from '@/types/chat';
import { toast } from '@/components/ui/sonner';
import { emitDebugEvent } from '@/utils/debug-events';

export const useChatState = () => {
  const transitionInProgress = useRef(false);
  const hasLoadedAuth = useRef(false);

  const handleTransitionStart = () => {
    console.log('Starting chat transition');
    transitionInProgress.current = true;
    emitDebugEvent({
      lastAction: 'Chat transition started',
      isTransitioning: true
    });
  };

  const handleTransitionEnd = () => {
    console.log('Ending chat transition');
    transitionInProgress.current = false;
    emitDebugEvent({
      lastAction: 'Chat transition completed',
      isTransitioning: false
    });
  };

  const handleAuthLoaded = () => {
    if (!hasLoadedAuth.current) {
      hasLoadedAuth.current = true;
      console.log('Chat auth state loaded');
      emitDebugEvent({
        lastAction: 'Auth state loaded'
      });
    }
  };

  return {
    isTransitioning: transitionInProgress.current,
    hasLoadedAuth: hasLoadedAuth.current,
    handleTransitionStart,
    handleTransitionEnd,
    handleAuthLoaded
  };
};
