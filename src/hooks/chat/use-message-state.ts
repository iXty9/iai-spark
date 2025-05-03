
import { useState, useCallback, useRef, useEffect } from 'react';
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
  
  // Save messages whenever they change
  useEffect(() => {
    if (hasInitialized.current && messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);
  
  // Use useCallback for all functions to prevent unnecessary re-renders
  const addMessage = useCallback((newMessage: Message) => {
    console.log('Adding message to state:', {
      id: newMessage.id,
      sender: newMessage.sender,
      timestamp: new Date().toISOString(),
      initializing: initializing.current,
      currentMessageCount: messages.length
    });
    
    emitDebugEvent({
      lastAction: `Adding ${newMessage.sender} message to state`,
      messagesCount: messages.length + 1,
      hasInteracted: true
    });
    
    if (messages.length === 0 && !initializing.current) {
      initializing.current = true;
      console.log('First message - initializing chat state');
      
      emitDebugEvent({
        lastAction: 'First message - initializing chat state',
        isTransitioning: true,
        hasInteracted: true
      });
    }
    
    // Using a function form of setState to ensure we have the latest state
    setMessages(prev => {
      const newMessages = [...prev, newMessage];
      console.log(`Messages updated: now have ${newMessages.length} messages`);
      return newMessages;
    });
    
    // Reset initializing flag after first message is added
    if (initializing.current && newMessage.sender === 'ai') {
      initializing.current = false;
      console.log('Initialization complete');
      
      emitDebugEvent({
        lastAction: 'Chat initialization complete',
        isTransitioning: false,
        screen: 'Chat Screen'
      });
    }
  }, [messages.length]);

  const clearMessages = useCallback(() => {
    if (messages.length === 0) return;
    
    console.log('Clearing chat history:', {
      messageCount: messages.length,
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
    
    // Also clear from localStorage
    clearChatHistory();
    
    toast.success('Chat history cleared');
  }, [messages.length]);

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

  return {
    messages,
    message,
    isLoading,
    setMessage,
    setIsLoading,
    addMessage,
    clearMessages,
    setMessages,
    resetState
  };
};
