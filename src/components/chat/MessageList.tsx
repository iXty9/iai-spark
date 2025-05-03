
import React, { useRef, useEffect, useState } from 'react';
import { Message as MessageType } from '@/types/chat';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { saveScrollPosition, loadScrollPosition } from '@/services/storage/chatPersistenceService';
import { logger } from '@/utils/logging';
import { useGesture } from 'react-use-gesture';
import { haptics } from '@/utils/haptic-feedback';
import { RefreshCw } from 'lucide-react';

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
  scrollRef?: React.RefObject<HTMLDivElement>;
  onRefresh?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading,
  scrollRef,
  onRefresh
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const refreshIndicatorRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isPullingToRefresh, setIsPullingToRefresh] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const prevMessagesLengthRef = useRef(messages.length);
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                     /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // Pull to refresh configuration
  const PULL_THRESHOLD = 80; // pixels
  const MAX_PULL_DISTANCE = 120;

  // Setup pull-to-refresh gesture
  const bindPullGesture = useGesture(
    {
      onDrag: ({ movement: [, my], dragging, cancel, event, direction: [, dirY], velocity: [, vy] }) => {
        if (!onRefresh || !scrollAreaRef.current || dirY < 0 || isLoading) return;
        
        const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (!scrollElement || scrollElement.scrollTop > 1) return;
        
        // We are at the top of the scroll area and pulling down
        event?.preventDefault();
        
        if (dragging && my > 0) {
          setIsPullingToRefresh(true);
          const progress = Math.min(1, my / PULL_THRESHOLD);
          setRefreshProgress(progress);
          
          // Apply visual feedback
          if (refreshIndicatorRef.current) {
            const rotation = my * 2;
            const opacity = Math.min(1, progress);
            const scale = 0.8 + (progress * 0.2);
            
            refreshIndicatorRef.current.style.transform = 
              `translateY(${Math.min(my/2, MAX_PULL_DISTANCE/2)}px) rotate(${rotation}deg) scale(${scale})`;
            refreshIndicatorRef.current.style.opacity = `${opacity}`;
          }
          
          // Trigger haptic feedback at threshold points
          if (progress >= 0.99 && refreshProgress < 0.99) {
            haptics.medium();
          } else if (progress >= 0.5 && refreshProgress < 0.5) {
            haptics.light();
          }
        }
        
        // Handle release
        if (!dragging && isPullingToRefresh) {
          if (refreshProgress >= 1) {
            // Threshold met, trigger refresh
            onRefresh();
            haptics.success();
          }
          
          // Reset state with animation
          if (refreshIndicatorRef.current) {
            refreshIndicatorRef.current.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            refreshIndicatorRef.current.style.transform = 'translateY(0) rotate(0) scale(1)';
            refreshIndicatorRef.current.style.opacity = '0';
            
            // Clear transition after animation completes
            setTimeout(() => {
              if (refreshIndicatorRef.current) {
                refreshIndicatorRef.current.style.transition = '';
              }
            }, 300);
          }
          
          setIsPullingToRefresh(false);
          setRefreshProgress(0);
          cancel();
        }
      }
    },
    {
      drag: {
        threshold: 5,
        filterTaps: true,
        rubberband: true
      }
    }
  );

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
    <div className="relative flex-1 w-full h-full">
      {/* Pull-to-refresh indicator */}
      <div 
        ref={refreshIndicatorRef} 
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full z-10 opacity-0 pointer-events-none"
      >
        <div className="bg-primary/10 backdrop-blur-sm rounded-full p-3 shadow-lg">
          <RefreshCw 
            className={cn(
              "h-6 w-6 text-primary",
              isPullingToRefresh && refreshProgress >= 1 && "animate-spin"
            )}
          />
        </div>
      </div>
      
      <ScrollArea 
        ref={scrollAreaRef}
        className="flex-1 p-4 overflow-y-auto w-full h-full bg-transparent"
        type="always"
        {...bindPullGesture()}
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
    </div>
  );
};
