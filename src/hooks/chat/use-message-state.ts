
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { toast } from '@/components/ui/sonner';
import { emitDebugEvent } from '@/utils/debug-events';
import { saveChatHistory, loadChatHistory, clearChatHistory } from '@/services/storage/chatPersistenceService';

export const useMessageState = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const initializing = useRef(false);
  const hasInitialized = useRef(false);
  
  // Load saved messages on initial render only
  useEffect(() => {
    if (!hasInitialized.current) {
      const savedMessages = loadChatHistory();
      if (savedMessages.length > 0) {
        setMessages(savedMessages);
        console.log(`Loaded ${savedMessages.length} messages from localStorage`);
        
        emitDebugEvent({
          lastAction: 'Restored chat history from localStorage',
          messagesCount: savedMessages.length,
          screen: 'Chat Screen'
        });
      }
      hasInitialized.current = true;
    }
  }, []);
  
  // Save messages whenever they change (memoized dependency)
  const messageCount = useMemo(() => messages.length, [messages.length]);
  
  useEffect(() => {
    if (hasInitialized.current && messageCount > 0) {
      saveChatHistory(messages);
    }
  }, [messages, messageCount]);
  
  // Memoized functions to prevent unnecessary re-renders
  const addMessage = useCallback((newMessage: Message) => {
    console.log('Adding message to state:', {
      id: newMessage.id,
      sender: newMessage.sender,
      timestamp: new Date().toISOString(),
      initializing: initializing.current,
      currentMessageCount: messageCount
    });
    
    emitDebugEvent({
      lastAction: `Adding ${newMessage.sender} message to state`,
      messagesCount: messageCount + 1,
      hasInteracted: true
    });
    
    if (messageCount === 0 && !initializing.current) {
      initializing.current = true;
      console.log('First message - initializing chat state');
      
      emitDebugEvent({
        lastAction: 'First message - initializing chat state',
        isTransitioning: true,
        hasInteracted: true
      });
    }
    
    // Use functional update for better performance
    setMessages(prev => {
      const newMessages = [...prev, newMessage];
      console.log(`Messages updated: now have ${newMessages.length} messages`);
      return newMessages;
    });
    
    // Reset initializing flag after first AI message
    if (initializing.current && newMessage.sender === 'ai') {
      initializing.current = false;
      console.log('Initialization complete');
      
      emitDebugEvent({
        lastAction: 'Chat initialization complete',
        isTransitioning: false,
        screen: 'Chat Screen'
      });
    }
  }, [messageCount]);

  const clearMessages = useCallback(() => {
    if (messageCount === 0) return;
    
    console.log('Clearing chat history:', {
      messageCount,
      timestamp: new Date().toISOString()
    });
    
    emitDebugEvent({
      lastAction: 'Clearing chat history',
      messagesCount: 0,
      screen: 'Welcome Screen',
      hasInteracted: false,
      isTransitioning: false
    });
    
    setMessages([]);
    initializing.current = false;
    
    // Clear from localStorage
    clearChatHistory();
    
    toast.success('Chat history cleared');
  }, [messageCount]);

  const resetState = useCallback(() => {
    console.log('Resetting message state');
    
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
    resetState
  }), [messages, message, isLoading, addMessage, clearMessages, resetState]);
};
