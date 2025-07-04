
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
  onAbortRequest?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading,
  scrollRef,
  onAbortRequest
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [hasRestoredScroll, setHasRestoredScroll] = useState(false);
  const prevMessagesLengthRef = useRef(messages.length);
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                     /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Restore scroll position whenever component mounts or messages are available
  useEffect(() => {
    const scrollableElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    
    if (scrollableElement && messages.length > 0 && !hasRestoredScroll) {
      const savedScrollPosition = loadScrollPosition();
      
      if (savedScrollPosition !== null && savedScrollPosition > 0) {
        logger.debug('Restoring scroll position after navigation', { position: savedScrollPosition }, { module: 'chat' });
        
        // Use requestAnimationFrame to ensure DOM is fully rendered
        requestAnimationFrame(() => {
          scrollableElement.scrollTop = savedScrollPosition;
          setUserHasScrolled(true);
          setHasRestoredScroll(true);
        });
      } else {
        // No saved position or at top, mark as restored to prevent future attempts
        setHasRestoredScroll(true);
      }
    }
  }, [messages.length, hasRestoredScroll]);
  
  // Save scroll position when user scrolls
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    
    const handleScroll = (e: Event) => {
      if (scrollArea) {
        const { scrollTop, scrollHeight, clientHeight } = e.target as HTMLElement;
        const isScrolledToBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 20;
        
        // Save the current scroll position using persistence service
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

  // Handle scrolling for new messages (but not when restoring position)
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: isIOSSafari ? 'auto' : 'smooth',
          block: 'end' 
        });
      }
    };

    // Only auto-scroll for new messages if we've already restored position or there's no saved position
    const hasNewMessages = messages.length > prevMessagesLengthRef.current;
    
    if (hasRestoredScroll && hasNewMessages && !userHasScrolled) {
      scrollToBottom();
    }
    
    // Always scroll when loading starts (new message being generated)
    if (isLoading && hasRestoredScroll) {
      setUserHasScrolled(false);
      scrollToBottom();
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, isLoading, userHasScrolled, hasRestoredScroll, isIOSSafari]);

  return (
    <ScrollArea 
      ref={scrollAreaRef}
      className="flex-1 p-4 overflow-y-auto w-full h-full bg-transparent touch-pan-y"
      type="always"
      style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      <div 
        className="message-list space-y-5 pb-6 bg-transparent" 
        role="log" 
        aria-live="polite" 
        aria-label="Chat messages"
      >
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        
        <TypingIndicator isVisible={isLoading} onAbort={onAbortRequest} />
        
        <div ref={messagesEndRef} aria-hidden="true" />
        {scrollRef && <div ref={scrollRef} aria-hidden="true" />}
      </div>
    </ScrollArea>
  );
};
