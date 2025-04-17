
import React, { useRef, useEffect } from 'react';
import { Message as MessageType } from '@/types/chat';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';

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
    <div className="message-list" role="log" aria-live="polite" aria-label="Chat messages">
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      
      <TypingIndicator isVisible={isLoading} />
      
      {/* This div helps us scroll to the bottom of the messages */}
      <div ref={messagesEndRef} />
    </div>
  );
};
