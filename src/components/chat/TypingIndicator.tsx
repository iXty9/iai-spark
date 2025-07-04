
import React, { useState, useEffect } from 'react';
import { TimerWithAbort } from './TimerWithAbort';
import { useAIAgentName } from '@/hooks/use-ai-agent-name';

interface TypingIndicatorProps {
  isVisible: boolean;
  onAbort?: () => void;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible, onAbort }) => {
  const [responseStatus, setResponseStatus] = useState<'thinking' | 'responding'>('thinking');
  const [requestStartTime, setRequestStartTime] = useState<number>(0);
  const { aiAgentName } = useAIAgentName();
  
  useEffect(() => {
    const handleStatusChange = (event: CustomEvent) => {
      if (event.detail?.status === 'responding') {
        setResponseStatus('responding');
      }
    };

    const handleRequestStart = (event: CustomEvent) => {
      if (event.detail?.startTime) {
        setRequestStartTime(event.detail.startTime);
      }
    };

    // Reset status to 'thinking' whenever visibility changes
    if (isVisible) {
      setResponseStatus('thinking');
      setRequestStartTime(Date.now());
    }
    
    // Listen for custom events
    window.addEventListener('aiResponseStatus', handleStatusChange as EventListener);
    window.addEventListener('aiRequestStart', handleRequestStart as EventListener);
    
    return () => {
      window.removeEventListener('aiResponseStatus', handleStatusChange as EventListener);
      window.removeEventListener('aiRequestStart', handleRequestStart as EventListener);
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
            ? `${aiAgentName} is thinking...` 
            : `${aiAgentName} is responding...`}
        </span>
        <div className="typing-dots">
          <div className="typing-dot" style={{ animationDelay: '0ms' }}></div>
          <div className="typing-dot" style={{ animationDelay: '200ms' }}></div>
          <div className="typing-dot" style={{ animationDelay: '400ms' }}></div>
        </div>
        
        {/* Timer with Abort Button */}
        <TimerWithAbort 
          startTime={requestStartTime} 
          onAbort={onAbort}
          isVisible={isVisible}
        />
      </div>
    </div>
  );
};
