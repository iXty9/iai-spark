
import React, { useRef, useEffect, useState } from 'react';
import { Message as MessageType } from '@/types/chat';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { saveScrollPosition, loadScrollPosition } from '@/services/storage/chatPersistenceService';
import { logger } from '@/utils/logging';

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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const prevMessagesLengthRef = useRef(messages.length);
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                     /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Load saved scroll position on initial mount
  useEffect(() => {
    const scrollableElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (scrollableElement && messages.length > 0 && isInitialLoad) {
      const savedScrollPosition = loadScrollPosition();
      
      if (savedScrollPosition !== null) {
        logger.debug('Restoring scroll position', { position: savedScrollPosition }, { module: 'chat' });
        // Use a small timeout to ensure DOM is ready
        setTimeout(() => {
          scrollableElement.scrollTop = savedScrollPosition;
          setUserHasScrolled(true);
        }, 100);
      }
      setIsInitialLoad(false);
    }
  }, [messages, isInitialLoad]);
  
  // Save scroll position when user scrolls
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    
    const handleScroll = (e: Event) => {
      if (scrollArea) {
        const { scrollTop, scrollHeight, clientHeight } = e.target as HTMLElement;
        const isScrolledToBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 20;
        
        // Save the current scroll position to localStorage
        if (!isIOSSafari || (isIOSSafari && !isLoading)) {
          saveScrollPosition(scrollTop);
        }
        
        setUserHasScrolled(!isScrolledToBottom);
      }
    };
    
    if (scrollArea) {
      const scrollableElement = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollableElement) {
        scrollableElement.addEventListener('scroll', handleScroll);
        
        // Special handling for iOS momentum scrolling
        if (isIOSSafari) {
          scrollableElement.addEventListener('touchend', () => {
            setTimeout(() => {
              const { scrollTop } = scrollableElement as HTMLElement;
              saveScrollPosition(scrollTop);
            }, 300); // Delay to account for momentum
          });
        }
        
        return () => {
          scrollableElement.removeEventListener('scroll', handleScroll);
          if (isIOSSafari) {
            scrollableElement.removeEventListener('touchend', () => {});
          }
        };
      }
    }
  }, [isIOSSafari, isLoading]);

  // Handle scrolling based on new messages or loading state
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: isIOSSafari ? 'auto' : 'smooth',
          block: 'end' 
        });
      }
    };

    // Scroll to bottom when new messages arrive (but not on initial load with saved position)
    const hasNewMessages = messages.length > prevMessagesLengthRef.current;
    
    if (hasNewMessages && !isInitialLoad) {
      scrollToBottom();
      setUserHasScrolled(false);
    }
    
    // Always scroll when loading starts
    if (isLoading) {
      setUserHasScrolled(false);
      scrollToBottom();
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages, isLoading, userHasScrolled, isInitialLoad, isIOSSafari]);

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
