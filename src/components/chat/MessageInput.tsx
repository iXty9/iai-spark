
import React, { useRef, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, Mic } from 'lucide-react';

interface MessageInputProps {
  message: string;
  onChange: (value: string) => void;
  onSubmit: (e?: FormEvent) => void;
  isLoading: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ 
  message, 
  onChange, 
  onSubmit, 
  isLoading 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus input on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Ensure focus returns after submission
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSubmit(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && message.trim() && !isLoading) {
      e.preventDefault(); // Prevent default to avoid double submission
      onSubmit();
    }
  };

  const handleSendClick = () => {
    if (message.trim() && !isLoading) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="message-input-container">
      <div className="flex items-center gap-2">
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="file-button"
          aria-label="Upload file"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What can I assist you with today?"
            className="pr-10 rounded-2xl"
            disabled={isLoading}
            aria-label="Message input"
          />
        </div>
        
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="file-button"
          aria-label="Voice input"
        >
          <Mic className="h-5 w-5" />
        </Button>
        
        <Button 
          type="button" // Changed to button type to have more control
          variant="default" 
          size="icon" 
          disabled={!message.trim() || isLoading}
          aria-label="Send message"
          className="rounded-full"
          onClick={handleSendClick}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
};
