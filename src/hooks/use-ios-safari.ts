
import { useEffect, useState } from 'react';

export const useIOSSafari = () => {
  const [showFallbackInput, setShowFallbackInput] = useState(false);
  const [hasMessages, setHasMessages] = useState(false);
  
  // Detect iOS Safari
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                     /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  useEffect(() => {
    // Check for messages less frequently
    const checkMessageState = () => {
      const messageElements = document.querySelectorAll('.chat-message');
      setHasMessages(messageElements.length > 0);
    };

    // Check message state initially and less frequently
    checkMessageState();
    const messageCheckInterval = setInterval(checkMessageState, 3000); // Reduced from 1000ms to 3000ms

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

    // iOS-specific keyboard handling - with reduced check frequency
    if (isIOSSafari) {
      let lastHeight = window.innerHeight;
      let lastCheckedAt = Date.now();
      const MIN_CHECK_INTERVAL = 5000; // Minimum 5 seconds between checks
      
      const checkHeight = () => {
        const now = Date.now();
        // Skip frequent checks
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
      
      window.addEventListener('resize', checkHeight);
      
      // Manage fallback input visibility with reduced frequency
      const checkInputVisibility = () => {
        // Don't check too frequently
        const now = Date.now();
        if (now - lastCheckedAt < MIN_CHECK_INTERVAL) {
          return;
        }
        lastCheckedAt = now;
        
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

      // Reduced check frequency from 1000ms to 5000ms
      const visibilityInterval = setInterval(checkInputVisibility, 5000);
      
      return () => {
        window.removeEventListener('resize', checkHeight);
        clearInterval(visibilityInterval);
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
