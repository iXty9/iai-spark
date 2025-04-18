
import React, { useState, useEffect } from 'react';

interface TypingIndicatorProps {
  isVisible: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible }) => {
  const [isLongWait, setIsLongWait] = useState(false);
  
  useEffect(() => {
    let longWaitTimer: ReturnType<typeof setTimeout>;
    
    if (isVisible) {
      setIsLongWait(false);
      
      // After 30 seconds, update the message
      longWaitTimer = setTimeout(() => {
        setIsLongWait(true);
      }, 30000);
    }
    
    return () => {
      if (longWaitTimer) {
        clearTimeout(longWaitTimer);
      }
      setIsLongWait(false);
    };
  }, [isVisible]);
  
  if (!isVisible) return null;
  
  return (
    <div className="typing-indicator" aria-live="polite">
      <div className="flex items-center">
        <img 
          src="https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png" 
          alt="Ixty AI" 
          className="w-5 h-5 mr-2"
        />
        <span>{isLongWait ? "Ixty AI is responding" : "Ixty AI is thinking"}</span>
        <div className="typing-dots">
          <div className="typing-dot" style={{ animationDelay: '0ms' }}></div>
          <div className="typing-dot" style={{ animationDelay: '200ms' }}></div>
          <div className="typing-dot" style={{ animationDelay: '400ms' }}></div>
        </div>
      </div>
    </div>
  );
};
