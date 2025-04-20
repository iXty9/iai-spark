
import React, { useEffect, useState } from 'react';
import { Chat } from '@/components/chat/Chat';
import { 
  logIOSSafariInfo, 
  setupDebugListeners, 
  testAlternativeLayout,
  checkLayoutRoot
} from '@/utils/debug';

const Index = () => {
  const [showFallbackInput, setShowFallbackInput] = useState(false);
  const [hasMessages, setHasMessages] = useState(false);

  useEffect(() => {
    // Run initial debugging
    logIOSSafariInfo();
    setupDebugListeners();
    checkLayoutRoot();
    
    // Test alternative layout after a delay to ensure the DOM is settled
    setTimeout(() => {
      testAlternativeLayout();
    }, 2000);
    
    // Try forcing visibility whenever the page loses and regains focus
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
    
    // Check if we have messages (whether we're on the welcome screen or not)
    const checkMessageState = () => {
      // Look for message elements as an indicator that we've moved past the welcome screen
      const messageElements = document.querySelectorAll('.chat-message');
      setHasMessages(messageElements.length > 0);
      console.log("Message check: found", messageElements.length, "messages");
    };

    // Check initially and then periodically
    checkMessageState();
    const messageCheckInterval = setInterval(checkMessageState, 1000);
    
    // Add an iOS-specific listener for keyboard appearance
    const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                       /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIOSSafari) {
      // For iOS, track viewport height changes which indicate keyboard appearance
      let lastHeight = window.innerHeight;
      
      const checkHeight = () => {
        if (window.innerHeight !== lastHeight) {
          console.log(`Height changed from ${lastHeight} to ${window.innerHeight}`);
          lastHeight = window.innerHeight;
          
          // When keyboard closes (height increases), make sure input is visible
          // When keyboard opens (height decreases), also check visibility
          setTimeout(() => {
            const inputContainer = document.getElementById('message-input-container');
            if (inputContainer && hasMessages) {
              const rect = inputContainer.getBoundingClientRect();
              console.log("Input position after height change:", rect);
              
              // Force visibility and proper positioning regardless of keyboard state
              inputContainer.style.display = 'block';
              inputContainer.style.position = 'relative';
              inputContainer.style.bottom = '0';
              inputContainer.style.visibility = 'visible';
              inputContainer.style.opacity = '1';
              
              // Scroll to make the input visible if it's offscreen
              if (rect.top > window.innerHeight || rect.bottom < 0) {
                inputContainer.scrollIntoView(false); // false = align to bottom
              }
            }
          }, 300);
        }
      };
      
      window.addEventListener('resize', checkHeight);
      
      return () => {
        window.removeEventListener('resize', checkHeight);
        clearInterval(messageCheckInterval);
      };
    }
    
    // New logic to manage fallback input visibility - only show fallback when we have messages
    // and the main input is hidden
    const checkInputVisibility = () => {
      if (!hasMessages) {
        setShowFallbackInput(false);
        return;
      }
      
      const inputContainer = document.getElementById('message-input-container');
      const messageInput = inputContainer?.querySelector('textarea');
      
      if (inputContainer && messageInput) {
        // Check multiple properties to determine if the input is truly visible
        const rect = inputContainer.getBoundingClientRect();
        const style = window.getComputedStyle(inputContainer);
        
        const isHidden = 
          rect.height === 0 || 
          style.display === 'none' || 
          style.visibility === 'hidden' ||
          style.opacity === '0' ||
          rect.bottom <= 0 || 
          rect.top >= window.innerHeight;
        
        // Only show fallback on iOS Safari when main input is truly hidden AND we have messages
        setShowFallbackInput(isIOSSafari && isHidden && hasMessages);
        
        console.log("Fallback visibility check:", {
          hasMessages,
          isHidden,
          showFallback: isIOSSafari && isHidden && hasMessages,
          rect: {
            height: rect.height,
            top: rect.top,
            bottom: rect.bottom
          },
          style: {
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity
          }
        });
      }
    };

    // Run checks periodically and after potential layout changes
    const visibilityInterval = setInterval(checkInputVisibility, 1000);
    window.addEventListener('resize', checkInputVisibility);

    return () => {
      clearInterval(visibilityInterval);
      clearInterval(messageCheckInterval);
      window.removeEventListener('resize', checkInputVisibility);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasMessages]);
  
  // Detect iOS Safari for conditional rendering
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                     /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  return (
    <div className={`h-screen w-full bg-background ${isIOSSafari ? 'ios-safari-page' : ''}`}>
      {/* Use a container div with iOS-specific height handling */}
      <div className={`h-full w-full ${isIOSSafari ? 'ios-viewport-fix' : ''}`}>
        <Chat />
      </div>
      
      {/* Only show fallback when required on iOS Safari AND we have messages */}
      {isIOSSafari && showFallbackInput && (
        <div 
          id="ios-fallback-input" 
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            padding: '8px',
            backgroundColor: 'var(--background)',
            borderTop: '1px solid var(--border)',
            minHeight: '40px',
            display: 'block', // Always visible if condition is met
          }}
        >
          <button 
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '20px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              textAlign: 'center',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
            onClick={() => {
              // Enhanced handler for the fallback button
              const realInput = document.querySelector('#message-input-container textarea');
              const container = document.getElementById('message-input-container');
              
              if (container) {
                // Force proper display
                container.style.display = 'block';
                container.style.visibility = 'visible';
                container.style.opacity = '1';
                container.style.position = 'relative';
                container.style.bottom = '0';
                container.style.zIndex = '1000';
                
                // Scroll to input
                container.scrollIntoView({ behavior: 'smooth', block: 'end' });
                
                // Focus the textarea
                if (realInput) {
                  setTimeout(() => {
                    (realInput as HTMLTextAreaElement).focus();
                  }, 300);
                }
                
                // Hide the fallback after focusing the real input
                setTimeout(() => {
                  setShowFallbackInput(false);
                }, 500);
              }
            }}
          >
            Tap here to type your message...
          </button>
        </div>
      )}
    </div>
  );
};

export default Index;
