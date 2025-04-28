
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logging';

export const useIOSSafari = () => {
  const [showFallbackInput, setShowFallbackInput] = useState(false);
  const [hasMessages, setHasMessages] = useState(false);
  
  // Detect iOS Safari - only once
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                     /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  useEffect(() => {
    // Check for messages much less frequently
    const checkMessageState = () => {
      const messageElements = document.querySelectorAll('.chat-message');
      setHasMessages(messageElements.length > 0);
    };

    // Check message state initially and very infrequently
    checkMessageState();
    const messageCheckInterval = setInterval(checkMessageState, 10000); // Reduced to every 10 seconds

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => {
          const inputContainer = document.getElementById('message-input-container');
          if (inputContainer && hasMessages) {
            inputContainer.style.display = 'block';
            inputContainer.style.visibility = 'visible';
            inputContainer.style.opacity = '1';
          }
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // iOS-specific keyboard handling - with drastically reduced check frequency
    if (isIOSSafari) {
      let lastHeight = window.innerHeight;
      const MIN_CHECK_INTERVAL = 30000; // Minimum 30 seconds between checks
      let lastCheckedAt = Date.now();
      
      // Log iOS detection once only
      logger.info("iOS Safari detected, applying compatibility fixes", null, { 
        once: true, 
        module: 'iOS-compat' 
      });
      
      const checkHeight = () => {
        const now = Date.now();
        // Only check after significant time has passed
        if (now - lastCheckedAt < MIN_CHECK_INTERVAL) {
          return;
        }
        
        if (window.innerHeight !== lastHeight) {
          lastHeight = window.innerHeight;
          lastCheckedAt = now;
          
          setTimeout(() => {
            const inputContainer = document.getElementById('message-input-container');
            if (inputContainer && hasMessages) {
              const rect = inputContainer.getBoundingClientRect();
              
              inputContainer.style.display = 'block';
              inputContainer.style.position = 'relative';
              inputContainer.style.bottom = '0';
              inputContainer.style.visibility = 'visible';
              inputContainer.style.opacity = '1';
              
              if (rect.top > window.innerHeight || rect.bottom < 0) {
                inputContainer.scrollIntoView(false);
              }
            }
          }, 300);
        }
      };
      
      // Use the resize event instead of polling
      window.addEventListener('resize', checkHeight);
      
      // Don't check input visibility repeatedly - only on key events
      const checkInputVisibility = () => {
        if (!hasMessages) {
          setShowFallbackInput(false);
          return;
        }
        
        const inputContainer = document.getElementById('message-input-container');
        const messageInput = inputContainer?.querySelector('textarea');
        
        if (inputContainer && messageInput) {
          const rect = inputContainer.getBoundingClientRect();
          const style = window.getComputedStyle(inputContainer);
          
          const isHidden = 
            rect.height === 0 || 
            style.display === 'none' || 
            style.visibility === 'hidden' ||
            style.opacity === '0' ||
            rect.bottom <= 0 || 
            rect.top >= window.innerHeight;
          
          setShowFallbackInput(isIOSSafari && isHidden && hasMessages);
        }
      };

      // Check when something significant happens instead of polling
      document.addEventListener('visibilitychange', checkInputVisibility);
      window.addEventListener('orientationchange', checkInputVisibility);
      
      return () => {
        window.removeEventListener('resize', checkHeight);
        window.removeEventListener('orientationchange', checkInputVisibility);
        document.removeEventListener('visibilitychange', checkInputVisibility);
        clearInterval(messageCheckInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => {
      clearInterval(messageCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasMessages, isIOSSafari]);

  return { isIOSSafari, showFallbackInput, hasMessages };
};
