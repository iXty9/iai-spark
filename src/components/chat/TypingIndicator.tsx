
import React, { useState, useEffect } from 'react';

interface TypingIndicatorProps {
  isVisible: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible }) => {
  const [responseStatus, setResponseStatus] = useState<'thinking' | 'responding'>('thinking');
  
  useEffect(() => {
    const handleStatusChange = (event: CustomEvent) => {
      if (event.detail?.status === 'responding') {
        setResponseStatus('responding');
      }
    };

    // Reset status to 'thinking' whenever visibility changes
    if (isVisible) {
      setResponseStatus('thinking');
    }
    
    // Listen for custom event from use-chat.ts
    window.addEventListener('aiResponseStatus', handleStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('aiResponseStatus', handleStatusChange as EventListener);
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
        <span>
          {responseStatus === 'thinking' 
            ? "Ixty AI is thinking..." 
            : "Ixty AI is responding..."}
        </span>
        <div className="typing-dots">
          <div className="typing-dot" style={{ animationDelay: '0ms' }}></div>
          <div className="typing-dot" style={{ animationDelay: '200ms' }}></div>
          <div className="typing-dot" style={{ animationDelay: '400ms' }}></div>
        </div>
      </div>
    </div>
  );
};
