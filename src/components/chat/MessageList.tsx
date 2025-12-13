
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Message as MessageType } from '@/types/chat';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { saveScrollPosition, loadScrollPosition } from '@/services/storage/chatPersistenceService';
import { logger } from '@/utils/logging';

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
  isRecallLoading?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement>;
  onAbortRequest?: () => void;
  onScrollStateChange?: (hasScrolledUp: boolean) => void;
  onRecall?: (datetime: string) => Promise<boolean>;
  hasRecallHistory?: boolean;
  onShowRecallHistory?: () => void;
  contextDatetime?: string | null;
  onClearContext?: () => void;
  onMessageSent?: boolean; // Trigger to force following mode when message is sent
}

export interface MessageListHandle {
  scrollToBottom: () => void;
}

// Threshold constants for scroll detection
const SCROLL_NEAR_BOTTOM_THRESHOLD = 30; // Distance to consider "at bottom"
const SCROLL_AWAY_THRESHOLD = 80; // Distance to consider "scrolled away"
const LAYOUT_CHANGE_DEBOUNCE_MS = 150; // Ignore scroll events after layout changes

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(({ 
  messages, 
  isLoading,
  isRecallLoading,
  scrollRef,
  onAbortRequest,
  onScrollStateChange,
  onRecall,
  hasRecallHistory,
  onShowRecallHistory,
  contextDatetime,
  onClearContext,
  onMessageSent
}, ref) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Intent-based "following mode" - tracks whether user wants to stay at bottom
  const [isFollowing, setIsFollowing] = useState(true);
  const [hasRestoredScroll, setHasRestoredScroll] = useState(false);
  
  const prevMessagesLengthRef = useRef(messages.length);
  const ignoreScrollUntilRef = useRef<number>(0); // Timestamp until which to ignore scroll events
  const lastMessageCountRef = useRef(messages.length);
  
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                     /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Helper to temporarily ignore scroll events (for layout changes)
  const ignoreScrollBriefly = useCallback(() => {
    ignoreScrollUntilRef.current = Date.now() + LAYOUT_CHANGE_DEBOUNCE_MS;
  }, []);

  // Expose scrollToBottom method via ref
  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      const scrollableElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollableElement) {
        // Enter following mode and ignore scroll events during animation
        setIsFollowing(true);
        ignoreScrollBriefly();
        
        scrollableElement.scrollTo({
          top: scrollableElement.scrollHeight,
          behavior: isIOSSafari ? 'auto' : 'smooth'
        });
        
        // Re-ignore after animation
        setTimeout(ignoreScrollBriefly, 300);
      }
    }
  }), [isIOSSafari, ignoreScrollBriefly]);

  // Notify parent when following state changes (inverted - parent sees "hasScrolledUp")
  useEffect(() => {
    onScrollStateChange?.(!isFollowing);
  }, [isFollowing, onScrollStateChange]);

  // Force following mode when a message is sent
  useEffect(() => {
    if (onMessageSent) {
      setIsFollowing(true);
      ignoreScrollBriefly();
    }
  }, [onMessageSent, ignoreScrollBriefly]);

  // Force following mode when new messages arrive and we're currently following
  useEffect(() => {
    const hasNewMessages = messages.length > lastMessageCountRef.current;
    
    if (hasNewMessages && isFollowing) {
      // Ignore layout-triggered scroll events when new message appears
      ignoreScrollBriefly();
    }
    
    lastMessageCountRef.current = messages.length;
  }, [messages.length, isFollowing, ignoreScrollBriefly]);

  // Restore scroll position on mount
  useEffect(() => {
    const scrollableElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    
    if (scrollableElement && messages.length > 0 && !hasRestoredScroll) {
      const savedScrollPosition = loadScrollPosition();
      
      if (savedScrollPosition !== null && savedScrollPosition > 0) {
        logger.debug('Restoring scroll position after navigation', { position: savedScrollPosition }, { module: 'chat' });
        
        requestAnimationFrame(() => {
          scrollableElement.scrollTop = savedScrollPosition;
          setIsFollowing(false); // User was scrolled up, don't auto-follow
          setHasRestoredScroll(true);
        });
      } else {
        setHasRestoredScroll(true);
      }
    }
  }, [messages.length, hasRestoredScroll]);
  
  // Main scroll event handler with intent-based detection
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    const scrollableElement = scrollArea?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    
    if (!scrollableElement) return;
    
    const handleScroll = () => {
      // Ignore scroll events during debounce period (layout changes, programmatic scrolls)
      if (Date.now() < ignoreScrollUntilRef.current) {
        return;
      }
      
      const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Save scroll position for persistence
      if (!isIOSSafari || !isLoading) {
        saveScrollPosition(scrollTop);
      }
      
      // Intent-based state transitions
      if (isFollowing) {
        // Exit following mode only if user scrolled significantly away
        if (distanceFromBottom > SCROLL_AWAY_THRESHOLD) {
          setIsFollowing(false);
        }
      } else {
        // Re-enter following mode if user scrolled back to bottom
        if (distanceFromBottom < SCROLL_NEAR_BOTTOM_THRESHOLD) {
          setIsFollowing(true);
        }
      }
    };
    
    scrollableElement.addEventListener('scroll', handleScroll, { passive: true });
    
    // iOS momentum scrolling handler
    if (isIOSSafari) {
      const handleTouchEnd = () => {
        setTimeout(() => {
          const { scrollTop } = scrollableElement;
          saveScrollPosition(scrollTop);
        }, 300);
      };
      scrollableElement.addEventListener('touchend', handleTouchEnd, { passive: true });
      
      return () => {
        scrollableElement.removeEventListener('scroll', handleScroll);
        scrollableElement.removeEventListener('touchend', handleTouchEnd);
      };
    }
    
    return () => {
      scrollableElement.removeEventListener('scroll', handleScroll);
    };
  }, [isIOSSafari, isLoading, isFollowing]);

  // Auto-scroll when following and new content arrives
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: isIOSSafari ? 'auto' : 'smooth',
          block: 'end' 
        });
      }
    };

    const hasNewMessages = messages.length > prevMessagesLengthRef.current;
    
    // Auto-scroll if following mode is active and new messages arrived
    if (hasRestoredScroll && hasNewMessages && isFollowing) {
      ignoreScrollBriefly();
      scrollToBottom();
    }
    
    // Auto-scroll when loading starts (AI is responding) and we're following
    if (isLoading && hasRestoredScroll && isFollowing) {
      ignoreScrollBriefly();
      scrollToBottom();
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, isLoading, isFollowing, hasRestoredScroll, isIOSSafari, ignoreScrollBriefly]);

  return (
    <ScrollArea 
      ref={scrollAreaRef}
      className="flex-1 py-4 px-2 overflow-y-auto w-full h-full bg-transparent touch-pan-y messages-container"
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
          <Message 
            key={message.id} 
            message={message} 
            onRecall={onRecall} 
            isRecallLoading={isRecallLoading}
            hasRecallHistory={hasRecallHistory}
            onShowRecallHistory={onShowRecallHistory}
            contextDatetime={contextDatetime}
            onClearContext={onClearContext}
          />
        ))}
        
        <TypingIndicator isVisible={isLoading} onAbort={onAbortRequest} />
        
        <div ref={messagesEndRef} aria-hidden="true" />
        {scrollRef && <div ref={scrollRef} aria-hidden="true" />}
      </div>
    </ScrollArea>
  );
});

MessageList.displayName = 'MessageList';
