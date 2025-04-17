
import React, { useRef, useEffect } from 'react';
import { Message as MessageType } from '@/types/chat';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change or typing state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <ScrollArea className="flex-1 p-4 relative overflow-y-auto">
      <div className="message-list space-y-4 pb-4" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        
        <TypingIndicator isVisible={isLoading} />
        
        {/* This div helps us scroll to the bottom of the messages */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};
