
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logging';
import { useDevMode } from '@/store/use-dev-mode';
import { eventManagerService } from '@/services/global/event-manager-service';
import { timerManagerService } from '@/services/global/timer-manager-service';
import { domManagerService } from '@/services/global/dom-manager-service';

export const useIOSSafari = () => {
  const [showFallbackInput, setShowFallbackInput] = useState(false);
  const [hasMessages, setHasMessages] = useState(false);
  const { isDevMode } = useDevMode();
  
  // Detect iOS Safari - only once
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                     /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  useEffect(() => {
    if (!isIOSSafari) return;
    
    // Log iOS detection once only in development or DevMode
    if ((process.env.NODE_ENV === 'development' || isDevMode) && isIOSSafari) {
      logger.info("iOS Safari detected", null, { 
        once: true, 
        module: 'iOS-compat' 
      });
    }
    
    // One-time check for messages
    const checkMessageState = () => {
      const messageElements = document.querySelectorAll('.chat-message');
      setHasMessages(messageElements.length > 0);
    };
    
    checkMessageState();
    
    let resizeTimerId: string | null = null;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        timerManagerService.setTimeout(() => checkInputVisibility(), 500);
      }
    };
    
    const handleOrientationChange = () => {
      timerManagerService.setTimeout(() => checkInputVisibility(), 300);
    };
    
    const handleResize = () => {
      if (resizeTimerId) {
        timerManagerService.clearTimer(resizeTimerId);
      }
      resizeTimerId = timerManagerService.setTimeout(() => {
        checkMessageState();
        checkInputVisibility();
        resizeTimerId = null;
      }, 500);
    };
    
    const checkInputVisibility = () => {
      if (!hasMessages) {
        setShowFallbackInput(false);
        return;
      }
      
      const inputInfo = domManagerService.getElementInfo('#message-input-container');
      if (!inputInfo.exists || !inputInfo.rect || !inputInfo.computedStyle) return;
      
      const { rect, computedStyle } = inputInfo;
      const viewport = domManagerService.getViewportInfo();
      
      const isHidden = 
        rect.height === 0 || 
        computedStyle.display === 'none' || 
        computedStyle.visibility === 'hidden' ||
        computedStyle.opacity === '0' ||
        rect.bottom <= 0 || 
        rect.top >= viewport.height;
      
      setShowFallbackInput(isHidden && hasMessages);
    };
    
    // Use event manager service for all event listeners
    const visibilityListenerId = eventManagerService.addDocumentListener('visibilitychange', handleVisibilityChange);
    const orientationListenerId = eventManagerService.addGlobalListener('orientationchange', handleOrientationChange);
    const resizeListenerId = eventManagerService.addGlobalListener('resize', handleResize);
    
    // Listen for new messages being added using DOM manager
    const chatContainer = document.querySelector('.messages-container');
    let mutationCleanup: (() => void) | null = null;
    
    if (chatContainer) {
      mutationCleanup = domManagerService.addMutationListener(chatContainer, () => {
        checkMessageState();
        checkInputVisibility();
      }, { childList: true, subtree: true });
    }
    
    // Immediately check visibility after load
    timerManagerService.setTimeout(checkInputVisibility, 1000);
    
    // Cleanup
    return () => {
      eventManagerService.removeListener(visibilityListenerId);
      eventManagerService.removeListener(orientationListenerId);
      eventManagerService.removeListener(resizeListenerId);
      if (resizeTimerId) {
        timerManagerService.clearTimer(resizeTimerId);
      }
      if (mutationCleanup) {
        mutationCleanup();
      }
    };
  }, [hasMessages, isIOSSafari, isDevMode]);

  return { isIOSSafari, showFallbackInput, hasMessages };
};
