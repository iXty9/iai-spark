
import React, { useRef, useEffect } from 'react';
import { Message as MessageType } from '@/types/chat';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { Welcome } from './Welcome';

interface MessageListProps {
  messages: MessageType[];
  isTyping: boolean;
  onStartChat: (message: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isTyping,
  onStartChat
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change or typing state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // If no messages, show the welcome component
  if (messages.length === 0) {
    return <Welcome onStartChat={onStartChat} />;
  }

  return (
    <div className="message-list" role="log" aria-live="polite" aria-label="Chat messages">
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      
      <TypingIndicator isVisible={isTyping} />
      
      {/* This div helps us scroll to the bottom of the messages */}
      <div ref={messagesEndRef} />
    </div>
  );
};
