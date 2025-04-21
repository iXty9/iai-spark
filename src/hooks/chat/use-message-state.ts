
import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { toast } from '@/components/ui/sonner';
import { emitDebugEvent } from '@/utils/debug-events';

export const useMessageState = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const initializing = useRef(false);
  
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
      messagesCount: messages.length + 1
    });
    
    if (messages.length === 0 && !initializing.current) {
      initializing.current = true;
      console.log('First message - initializing chat state');
      
      emitDebugEvent({
        lastAction: 'First message - initializing chat state',
        isTransitioning: true
      });
    }
    
    setMessages(prev => [...prev, newMessage]);
    
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
      messagesCount: 0
    });
    
    setMessages([]);
    toast.success('Chat history cleared');
  }, [messages.length]);

  const resetState = useCallback(() => {
    console.log('Resetting message state');
    
    emitDebugEvent({
      lastAction: 'Resetting message state',
      isLoading: false,
      inputState: 'Ready'
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
