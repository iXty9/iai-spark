
import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { toast } from '@/components/ui/sonner';

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
    
    if (messages.length === 0 && !initializing.current) {
      initializing.current = true;
      console.log('First message - initializing chat state');
    }
    
    setMessages(prev => [...prev, newMessage]);
    
    // Reset initializing flag after first message is added
    if (initializing.current && newMessage.sender === 'ai') {
      initializing.current = false;
      console.log('Initialization complete');
    }
  }, [messages.length]);

  const clearMessages = useCallback(() => {
    if (messages.length === 0) return;
    
    console.log('Clearing chat history:', {
      messageCount: messages.length,
      timestamp: new Date().toISOString()
    });
    
    setMessages([]);
    toast.success('Chat history cleared');
  }, [messages.length]);

  const resetState = useCallback(() => {
    console.log('Resetting message state');
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
