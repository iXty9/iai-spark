
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logging';
import { useDevMode } from '@/store/use-dev-mode';

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
    
    // Event-based approach instead of polling
    const events = ['visibilitychange', 'orientationchange', 'resize'];
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => checkInputVisibility(), 500);
      }
    };
    
    const handleOrientationChange = () => {
      setTimeout(() => checkInputVisibility(), 300);
    };
    
    // Only run a resize check with a delay
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        checkMessageState();
        checkInputVisibility();
      }, 500);
    };
    
    const checkInputVisibility = () => {
      if (!hasMessages) {
        setShowFallbackInput(false);
        return;
      }
      
      const inputContainer = document.getElementById('message-input-container');
      if (!inputContainer) return;
      
      const rect = inputContainer.getBoundingClientRect();
      const style = window.getComputedStyle(inputContainer);
      
      const isHidden = 
        rect.height === 0 || 
        style.display === 'none' || 
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        rect.bottom <= 0 || 
        rect.top >= window.innerHeight;
      
      setShowFallbackInput(isHidden && hasMessages);
    };
    
    // Listen for new messages being added
    const messageObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          checkMessageState();
        }
      });
    });
    
    const chatContainer = document.querySelector('.messages-container');
    if (chatContainer) {
      messageObserver.observe(chatContainer, { childList: true, subtree: true });
    }
    
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      messageObserver.disconnect();
    };
  }, [hasMessages, isIOSSafari, isDevMode]);

  return { isIOSSafari, showFallbackInput, hasMessages };
};
