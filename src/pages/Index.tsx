
import React, { useEffect } from 'react';
import { Chat } from '@/components/chat/Chat';
import { 
  logIOSSafariInfo, 
  setupDebugListeners, 
  testAlternativeLayout,
  checkLayoutRoot
} from '@/utils/debug';

const Index = () => {
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
    // (which can happen when the keyboard appears/disappears)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Page visibility changed to visible");
        setTimeout(() => {
          const inputContainer = document.getElementById('message-input-container');
          if (inputContainer) {
            console.log("Forcing input container visibility after focus change");
            inputContainer.style.display = 'block';
            inputContainer.style.visibility = 'visible';
            inputContainer.style.opacity = '1';
          }
        }, 500);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
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
            if (inputContainer) {
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
      };
    }
    
    // Log when messages state changes in localStorage for persistence
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      console.log(`localStorage.setItem('${key}', '${value.substring(0, 50)}...')`);
      originalSetItem.apply(this, [key, value]);
    };
    
    return () => {
      // Restore original function
      localStorage.setItem = originalSetItem;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Detect iOS Safari for conditional rendering
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                       /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  return (
    <div className={`h-screen w-full bg-background ${isIOSSafari ? 'ios-safari-page' : ''}`}>
      {/* Use a container div with iOS-specific height handling */}
      <div className={`h-full w-full ${isIOSSafari ? 'ios-viewport-fix' : ''}`}>
        <Chat />
      </div>
      
      {/* Fallback input container that is always visible on iOS Safari */}
      {isIOSSafari && (
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
            display: 'none', // Initially hidden, will be shown via JS if the main input disappears
          }}
        >
          <button 
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '20px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              textAlign: 'center',
            }}
            onClick={() => {
              // When clicked, try to focus the real input or make it visible
              const realInput = document.querySelector('#message-input-container textarea');
              if (realInput) {
                (realInput as HTMLTextAreaElement).focus();
              }
              
              // Also try to force the container to be visible
              const container = document.getElementById('message-input-container');
              if (container) {
                container.style.display = 'block';
                container.style.visibility = 'visible';
                container.style.opacity = '1';
              }
            }}
          >
            Type a message...
          </button>
        </div>
      )}
    </div>
  );
};

export default Index;
