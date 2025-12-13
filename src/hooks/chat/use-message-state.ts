
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Message } from '@/types/chat';
import { toast } from '@/components/ui/sonner';
import { emitDebugEvent } from '@/utils/debug-events';
import { saveChatHistory, loadChatHistory, clearChatHistory } from '@/services/storage/chatPersistenceService';
import { fetchActiveMessages, insertActiveMessage, clearActiveMessages } from '@/services/chat/active-chat-service';
import { sendClearContextWebhook } from '@/services/webhook/clear-context-webhook';
import { broadcastClearChat } from '@/hooks/chat/use-chat-sync';
import { logger } from '@/utils/logging';

interface UseMessageStateOptions {
  userId?: string | null;
}

export const useMessageState = (options: UseMessageStateOptions = {}) => {
  const { userId } = options;
  const isAuthenticated = !!userId;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const initializing = useRef(false);
  const isBulkOperation = useRef(false);
  const isSyncing = useRef(false);
  
  // Track which context we initialized in (not just boolean)
  // This fixes PWA race condition where auth loads after initial render
  const initializedContext = useRef<'anonymous' | 'authenticated' | null>(null);
  
  // Load saved messages on initial render OR when auth context changes
  useEffect(() => {
    const targetContext = isAuthenticated ? 'authenticated' : 'anonymous';
    
    // Skip if we already initialized in this same context
    if (initializedContext.current === targetContext) return;
    
    // For authenticated context, require userId to be available
    if (isAuthenticated && !userId) return;
    
    const loadMessages = async () => {
      logger.debug('Initializing message state', { 
        targetContext, 
        previousContext: initializedContext.current,
        userId 
      }, { module: 'message-state' });
      
      if (isAuthenticated && userId) {
        // Clear any stale anonymous messages before loading from Supabase
        if (initializedContext.current === 'anonymous') {
          logger.debug('Transitioning from anonymous to authenticated, clearing stale messages', {}, { module: 'message-state' });
          setMessages([]);
        }
        
        // Authenticated: load from Supabase (source of truth)
        try {
          const savedMessages = await fetchActiveMessages(userId);
          setMessages(savedMessages);
          logger.debug('Loaded messages from Supabase', { count: savedMessages.length }, { module: 'message-state' });
          
          emitDebugEvent({
            lastAction: 'Restored chat history from Supabase',
            messagesCount: savedMessages.length,
            screen: savedMessages.length > 0 ? 'Chat Screen' : 'Welcome Screen'
          });
        } catch (error) {
          logger.error('Failed to load messages from Supabase', error, { module: 'message-state' });
          // Don't fallback to localStorage - Supabase is source of truth
          setMessages([]);
          toast.error('Failed to load chat history. Please refresh.');
        }
        initializedContext.current = 'authenticated';
      } else {
        // Anonymous: load from localStorage
        const savedMessages = loadChatHistory();
        if (savedMessages.length > 0) {
          setMessages(savedMessages);
          logger.debug('Loaded messages from localStorage', { count: savedMessages.length }, { module: 'message-state' });
          
          emitDebugEvent({
            lastAction: 'Restored chat history from localStorage',
            messagesCount: savedMessages.length,
            screen: 'Chat Screen'
          });
        }
        initializedContext.current = 'anonymous';
      }
    };
    
    loadMessages();
  }, [isAuthenticated, userId]);
  
  // Force sync when app becomes visible (mobile wake-up, tab switch, PWA resume)
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !isSyncing.current) {
        isSyncing.current = true;
        logger.debug('App became visible, syncing messages', {}, { module: 'message-state' });
        
        try {
          const freshMessages = await fetchActiveMessages(userId);
          setMessages(freshMessages);
          logger.debug('Synced messages on visibility change', { count: freshMessages.length }, { module: 'message-state' });
        } catch (error) {
          logger.error('Failed to sync messages on visibility change', error, { module: 'message-state' });
        } finally {
          isSyncing.current = false;
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, userId]);
  
  // Save messages whenever they change (only for anonymous users)
  const messageCount = useMemo(() => messages.length, [messages.length]);
  
  useEffect(() => {
    // Skip during bulk operations or before initialization
    if (!initializedContext.current || isBulkOperation.current) return;
    
    // Only save to localStorage for anonymous users
    if (!isAuthenticated && messageCount > 0) {
      saveChatHistory(messages);
    }
  }, [messages, messageCount, isAuthenticated]);
  
  // Memoized functions to prevent unnecessary re-renders
  const addMessage = useCallback((newMessage: Message) => {
    logger.debug('Adding message to state', {
      id: newMessage.id,
      sender: newMessage.sender,
      currentMessageCount: messageCount
    }, { module: 'message-state' });
    
    emitDebugEvent({
      lastAction: `Adding ${newMessage.sender} message to state`,
      messagesCount: messageCount + 1,
      hasInteracted: true
    });
    
    if (messageCount === 0 && !initializing.current) {
      initializing.current = true;
      logger.debug('First message - initializing chat state', {}, { module: 'message-state' });
      
      emitDebugEvent({
        lastAction: 'First message - initializing chat state',
        isTransitioning: true,
        hasInteracted: true
      });
    }
    
    // Use functional update for better performance
    setMessages(prev => {
      const newMessages = [...prev, newMessage];
      logger.debug('Messages updated', { messageCount: newMessages.length }, { module: 'message-state' });
      return newMessages;
    });
    
    // Insert to Supabase for authenticated users (async, non-blocking)
    if (isAuthenticated && userId && !isBulkOperation.current) {
      insertActiveMessage(userId, newMessage).catch(error => {
        logger.error('Failed to sync message to Supabase', error, { module: 'message-state' });
      });
    }
    
    // Reset initializing flag after first AI message
    if (initializing.current && newMessage.sender === 'ai') {
      initializing.current = false;
      logger.debug('Message state initialization complete', {}, { module: 'message-state' });
      
      emitDebugEvent({
        lastAction: 'Chat initialization complete',
        isTransitioning: false,
        screen: 'Chat Screen'
      });
    }
  }, [messageCount, isAuthenticated, userId]);

  const clearMessages = useCallback(async () => {
    if (messageCount === 0) return;
    
    logger.info('Clearing chat history', { messageCount }, { module: 'message-state' });
    
    emitDebugEvent({
      lastAction: 'Clearing chat history',
      messagesCount: 0,
      screen: 'Welcome Screen',
      hasInteracted: false,
      isTransitioning: false
    });
    
    setMessages([]);
    initializing.current = false;
    
    if (isAuthenticated && userId) {
      // Clear from Supabase and notify n8n
      try {
        await clearActiveMessages(userId);
        // Broadcast clear event to other instances
        await broadcastClearChat(userId);
        // Send clear context webhook (sessionId = userId for authenticated users)
        sendClearContextWebhook(userId, userId).catch(error => {
          logger.error('Clear context webhook failed', error, { module: 'message-state' });
        });
      } catch (error) {
        logger.error('Failed to clear messages from Supabase', error, { module: 'message-state' });
      }
    } else {
      // Clear from localStorage
      clearChatHistory();
    }
    
    toast.success('Chat history cleared');
  }, [messageCount, isAuthenticated, userId]);

  const resetState = useCallback(() => {
    logger.debug('Resetting message state', {}, { module: 'message-state' });
    
    emitDebugEvent({
      lastAction: 'Resetting message state',
      isLoading: false,
      inputState: 'Ready',
      isTransitioning: false
    });
    
    setMessage('');
    setIsLoading(false);
    initializing.current = false;
  }, []);

  // Memoized return object to prevent unnecessary re-renders
  return useMemo(() => ({
    messages,
    message,
    isLoading,
    setMessage,
    setIsLoading,
    addMessage,
    clearMessages,
    setMessages,
    resetState,
    isBulkOperation // Exposed for import operations
  }), [messages, message, isLoading, addMessage, clearMessages, resetState]);
};
