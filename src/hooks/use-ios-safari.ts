
import { useEffect, useState } from 'react';
import { 
  logIOSSafariInfo, 
  setupDebugListeners,
  testAlternativeLayout, 
  checkLayoutRoot 
} from '@/utils/debug';

export const useIOSSafari = () => {
  const [showFallbackInput, setShowFallbackInput] = useState(false);
  const [hasMessages, setHasMessages] = useState(false);
  
  // Detect iOS Safari
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                     /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  useEffect(() => {
    // Initial debugging
    logIOSSafariInfo();
    setupDebugListeners();
    checkLayoutRoot();
    
    // Test alternative layout after DOM is settled
    setTimeout(() => {
      testAlternativeLayout();
    }, 2000);
    
    // Check for messages periodically
    const checkMessageState = () => {
      const messageElements = document.querySelectorAll('.chat-message');
      setHasMessages(messageElements.length > 0);
      console.log("Message check: found", messageElements.length, "messages");
    };

    // Check message state initially and periodically
    checkMessageState();
    const messageCheckInterval = setInterval(checkMessageState, 1000);

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Page visibility changed to visible");
        setTimeout(() => {
          const inputContainer = document.getElementById('message-input-container');
          if (inputContainer && hasMessages) {
            console.log("Forcing input container visibility after focus change");
            inputContainer.style.display = 'block';
            inputContainer.style.visibility = 'visible';
            inputContainer.style.opacity = '1';
          }
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // iOS-specific keyboard handling
    if (isIOSSafari) {
      let lastHeight = window.innerHeight;
      
      const checkHeight = () => {
        if (window.innerHeight !== lastHeight) {
          console.log(`Height changed from ${lastHeight} to ${window.innerHeight}`);
          lastHeight = window.innerHeight;
          
          setTimeout(() => {
            const inputContainer = document.getElementById('message-input-container');
            if (inputContainer && hasMessages) {
              const rect = inputContainer.getBoundingClientRect();
              console.log("Input position after height change:", rect);
              
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
      
      // Manage fallback input visibility
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

      const visibilityInterval = setInterval(checkInputVisibility, 1000);
      window.addEventListener('resize', checkInputVisibility);

      return () => {
        window.removeEventListener('resize', checkHeight);
        window.removeEventListener('resize', checkInputVisibility);
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
