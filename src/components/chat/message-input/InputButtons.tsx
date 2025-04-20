
import React from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Send, Mic } from 'lucide-react';

interface InputButtonsProps {
  message: string;
  isLoading: boolean;
  onSendClick: () => void;
}

export const InputButtons: React.FC<InputButtonsProps> = ({
  message,
  isLoading,
  onSendClick
}) => {
  return (
    <>
      <Button 
        type="button" 
        variant="ghost" 
        size="icon" 
        className="file-button shrink-0"
        aria-label="Upload file"
      >
        <Paperclip className="h-5 w-5" />
      </Button>
      
      <Button 
        type="button" 
        variant="ghost" 
        size="icon" 
        className="file-button shrink-0"
        aria-label="Voice input"
      >
        <Mic className="h-5 w-5" />
      </Button>
      
      <Button 
        type="button" 
        variant="default" 
        size="icon" 
        disabled={!message.trim() || isLoading}
        aria-label="Send message"
        className="rounded-full shrink-0"
        onClick={onSendClick}
      >
        <Send className="h-5 w-5" />
      </Button>
    </>
  );
};
