
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
  const { user } = useAuth();
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('Authentication state change in useChat:', user ? 'User is logged in' : 'User is logged out');
  }, [user]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!message.trim()) return;

    const userMessage: MessageType = {
      id: uuidv4(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    
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
      setIsLoading(false);
    }
  }, [message, user]);

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
        setIsLoading(false);
      });
  }, [user]);

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
