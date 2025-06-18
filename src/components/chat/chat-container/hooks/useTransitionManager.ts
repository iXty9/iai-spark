
import { useEffect, useRef } from 'react';
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';

interface UseTransitionManagerProps {
  isDevMode: boolean;
  messages: any[];
  hasInteracted: boolean;
  isTransitioning: boolean;
  setIsTransitioning: (value: boolean) => void;
  setHasInteracted: (value: boolean) => void;
}

export const useTransitionManager = ({
  isDevMode,
  messages,
  hasInteracted,
  isTransitioning,
  setIsTransitioning,
  setHasInteracted
}: UseTransitionManagerProps) => {
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Main state management effect
  useEffect(() => {
    if (!isDevMode) return;

    if (messages.length > 0 && !hasInteracted) {
      logger.info('Transitioning from Welcome to Chat UI', {
        messageCount: messages.length, hasInteracted,
        timestamp: new Date().toISOString()
      }, { module: 'ui' });
      setIsTransitioning(true);
      emitDebugEvent({ lastAction: 'Starting transition to chat', isTransitioning: true, screen: 'Transitioning to Chat' });
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = setTimeout(() => {
        setHasInteracted(true);
        setIsTransitioning(false);
        emitDebugEvent({
          lastAction: 'Completed transition to chat', isTransitioning: false, hasInteracted: true, screen: 'Chat Screen'
        });
        transitionTimeoutRef.current = null;
      }, 100);
    }

    if (messages.length === 0 && hasInteracted) {
      logger.info('Resetting to Welcome screen (messages cleared)', {}, { module: 'ui' });
      setHasInteracted(false);
      emitDebugEvent({
        screen: 'Welcome Screen',
        lastAction: 'Reset to welcome screen (messages cleared)',
        hasInteracted: false,
        isTransitioning: false
      });
    }
  }, [messages.length, hasInteracted, setHasInteracted, setIsTransitioning, isDevMode]);

  // Safety timeout for transitions
  useEffect(() => {
    if (!isTransitioning || !isDevMode) return;
    const timeout = setTimeout(() => {
      setIsTransitioning(false);
      if (messages.length > 0) {
        setHasInteracted(true);
        emitDebugEvent({
          lastAction: 'Force completed transition to chat (timeout)',
          isTransitioning: false, hasInteracted: true, screen: 'Chat Screen'
        });
      } else {
        emitDebugEvent({
          lastAction: 'Force reset to welcome screen (timeout)',
          isTransitioning: false, hasInteracted: false, screen: 'Welcome Screen'
        });
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [isTransitioning, messages.length, setHasInteracted, setIsTransitioning, isDevMode]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
  }, []);

  return { transitionTimeoutRef };
};
