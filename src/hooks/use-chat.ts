import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message as MessageType } from '@/types/chat';
import { sendMessage, exportChat } from '@/services/chatService';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';

export const useChat = () => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const messageListRef = useRef<HTMLDivElement>(null);
  const hasLoadedAuth = useRef(false);

  useEffect(() => {
    if (!authLoading && !hasLoadedAuth.current) {
      hasLoadedAuth.current = true;
      console.log('Authentication state loaded in useChat:', user ? 'User is logged in' : 'User is logged out');
    }
  }, [user, authLoading]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!message.trim()) return;
    
    // Prevent sending if auth is still loading
    if (authLoading) {
      toast.error("Please wait while we load your profile...");
      return;
    }

    const userMessage: MessageType = {
      id: uuidv4(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    
    // First warning after 30 seconds if response is still loading
    const firstWarningTimeout = setTimeout(() => {
      toast.info("Ixty AI is still thinking. This might take a moment...");
      
      // Dispatch a custom event for the typing indicator to switch messages
      window.dispatchEvent(new CustomEvent('aiResponseStatus', { detail: { status: 'responding' } }));
    }, 30000);

    try {
      console.log('Sending message with auth state:', user ? 'authenticated' : 'unauthenticated');
      const aiResponse = await sendMessage(message);
      
      const aiMessage: MessageType = {
        id: uuidv4(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get a response. Please try again.');
    } finally {
      clearTimeout(firstWarningTimeout);
      setIsLoading(false);
    }
  }, [message, user, authLoading]);

  const handleClearChat = useCallback(() => {
    if (messages.length === 0) return;
    
    setMessages([]);
    toast.success('Chat history cleared');
  }, [messages.length]);

  const handleExportChat = useCallback(() => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }
    
    exportChat(messages);
    toast.success('Chat exported successfully');
  }, [messages]);

  const startChat = useCallback((initialMessage: string) => {
    // Prevent starting if auth is still loading
    if (authLoading) {
      toast.error("Please wait while we load your profile...");
      return;
    }
    
    console.log("startChat called with:", initialMessage);
    console.log('Auth state during startChat:', user ? 'authenticated' : 'unauthenticated');
    
    const userMessage: MessageType = {
      id: uuidv4(),
      content: initialMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages([userMessage]);
    setIsLoading(true);
    
    // First warning after 30 seconds if response is still loading
    const firstWarningTimeout = setTimeout(() => {
      toast.info("Ixty AI is still thinking. This might take a moment...");
      
      // Dispatch a custom event for the typing indicator to switch messages
      window.dispatchEvent(new CustomEvent('aiResponseStatus', { detail: { status: 'responding' } }));
    }, 30000);
    
    sendMessage(initialMessage)
      .then(aiResponse => {
        const aiMessage: MessageType = {
          id: uuidv4(),
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
      })
      .catch(error => {
        console.error('Error getting AI response:', error);
        toast.error('Failed to get a response. Please try again.');
      })
      .finally(() => {
        clearTimeout(firstWarningTimeout);
        setIsLoading(false);
      });
  }, [user, authLoading]);

  return {
    messages,
    message,
    isLoading,
    setMessage,
    handleSubmit,
    handleClearChat,
    handleExportChat,
    startChat
  };
};
