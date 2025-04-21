
import React, { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Circle, Info } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { emitDebugEvent } from '@/utils/debug-events';

interface WelcomeProps {
  onStartChat: (message: string) => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onStartChat }) => {
  const [message, setMessage] = React.useState('');
  const isMobile = useIsMobile();
  const [avatarError, setAvatarError] = React.useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    emitDebugEvent({
      screen: 'Welcome Screen',
      lastAction: 'Welcome screen loaded',
      isLoading: false,
      hasInteracted: false
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  const submitMessage = () => {
    if (!message.trim() || isSubmitting) return;
    
    console.log('Welcome screen: Starting chat with message:', {
      message: message.trim(),
      timestamp: new Date().toISOString()
    });
    
    emitDebugEvent({
      lastAction: `Welcome screen: Submit clicked with message: "${message.trim()}"`,
      isLoading: true,
      inputState: 'Submitting'
    });
    
    setIsSubmitting(true);
    
    const messageToSend = message.trim();
    setMessage('');
    
    // We use setTimeout to ensure React state updates complete before transition
    setTimeout(() => {
      emitDebugEvent({
        lastAction: 'Starting chat from welcome screen',
        isTransitioning: true
      });
      
      onStartChat(messageToSend);
      // We keep isSubmitting true - it will be reset by the parent component
      // after the message is processed
    }, 0);
  };

  const handleImageError = () => {
    console.log("Avatar image failed to load");
    setAvatarError(true);
  };
  
  // Track state changes in submission
  useEffect(() => {
    if (isSubmitting) {
      emitDebugEvent({
        inputState: 'Disabled - Submitting',
        isLoading: true
      });
    }
  }, [isSubmitting]);

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-4">
      <div className="w-full text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <Avatar className="w-16 h-16 relative">
            {!avatarError ? (
              <AvatarImage 
                src="https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png"
                alt="Ixty AI Logo" 
                onError={handleImageError}
              />
            ) : null}
            <AvatarFallback className="bg-[#ea384c]/10 text-[#ea384c] font-bold flex items-center justify-center">
              <div className="relative">
                <Circle className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#ea384c] w-full h-full" />
                <Info className="relative z-10 text-[#ea384c]" size={18} />
              </div>
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2 text-left">
            <h1 className="text-2xl font-bold text-[#ea384c]">Ixty AI</h1>
            <p className="text-muted-foreground">
              "The Everywhere Intelligent Assistant"
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-xl mx-auto">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isMobile ? "Ask me anything..." : "What can I assist you with today?"}
            className="flex-1 rounded-full shadow-sm"
            disabled={isSubmitting}
            aria-label="Message input"
            spellCheck="true"
          />
          <Button 
            type="submit" 
            disabled={!message.trim() || isSubmitting} 
            className="rounded-full bg-[#ea384c] hover:bg-[#dd3333]"
          >
            {isMobile ? <Send className="h-4 w-4" /> : <>Send <Send className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>
      </div>
    </div>
  );
};
