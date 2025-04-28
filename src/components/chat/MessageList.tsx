
import React, { useRef, useEffect, useState } from 'react';
import { Message as MessageType } from '@/types/chat';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
  scrollRef?: React.RefObject<HTMLDivElement>;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading,
  scrollRef
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  
  useEffect(() => {
    const scrollToBottom = () => {
      if (!userHasScrolled && messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };

    if (messages.length > 0) {
      scrollToBottom();
    }
    
    if (isLoading) {
      setUserHasScrolled(false);
      scrollToBottom();
    }
  }, [messages, isLoading, userHasScrolled]);
  
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    
    const handleScroll = (e: Event) => {
      if (scrollArea) {
        const { scrollTop, scrollHeight, clientHeight } = e.target as HTMLElement;
        const isScrolledToBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
        
        setUserHasScrolled(!isScrolledToBottom);
      }
    };
    
    if (scrollArea) {
      const scrollableElement = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollableElement) {
        scrollableElement.addEventListener('scroll', handleScroll);
        
        return () => {
          scrollableElement.removeEventListener('scroll', handleScroll);
        };
      }
    }
  }, []);

  return (
    <ScrollArea 
      ref={scrollAreaRef}
      className="flex-1 p-4 overflow-y-auto w-full h-full bg-transparent"
      type="always"
    >
      <div 
        className="message-list space-y-4 pb-4 bg-transparent" 
        role="log" 
        aria-live="polite" 
        aria-label="Chat messages"
      >
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        
        <TypingIndicator isVisible={isLoading} />
        
        <div ref={messagesEndRef} aria-hidden="true" />
        {scrollRef && <div ref={scrollRef} aria-hidden="true" />}
      </div>
    </ScrollArea>
  );
};
