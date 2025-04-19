
import React, { useEffect } from 'react';
import { Chat } from '@/components/chat/Chat';
import { logIOSSafariInfo, setupDebugListeners } from '@/utils/debug';

const Index = () => {
  useEffect(() => {
    // Run initial debugging
    logIOSSafariInfo();
    setupDebugListeners();
    
    // Log when messages state changes in localStorage for persistence
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      console.log(`localStorage.setItem('${key}', '${value.substring(0, 50)}...')`);
      originalSetItem.apply(this, [key, value]);
    };
    
    return () => {
      // Restore original function
      localStorage.setItem = originalSetItem;
    };
  }, []);
  
  return (
    <div className="h-screen w-full bg-background">
      {/* Added iOS-specific wrapper div with full height and explicit display mode */}
      <div className="h-full w-full ios-viewport-fix">
        <Chat />
      </div>
    </div>
  );
};

export default Index;
