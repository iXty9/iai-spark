
import React from 'react';

interface TypingIndicatorProps {
  isVisible: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="typing-indicator" aria-live="polite">
      <div className="flex items-center">
        <img 
          src="https://ixty.ai/wp-content/uploads/2024/11/faviconV4.png" 
          alt="Ixty AI" 
          className="w-5 h-5 mr-2"
        />
        <span>Ixty AI is responding</span>
        <div className="typing-dots">
          <div className="typing-dot" style={{ animationDelay: '0ms' }}></div>
          <div className="typing-dot" style={{ animationDelay: '200ms' }}></div>
          <div className="typing-dot" style={{ animationDelay: '400ms' }}></div>
        </div>
      </div>
    </div>
  );
};
