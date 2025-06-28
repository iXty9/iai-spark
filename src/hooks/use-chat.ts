
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/hooks/use-toast"
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket, ProactiveMessage } from '@/contexts/WebSocketContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  sender?: string;
  metadata?: Record<string, any>;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isConnected: isWebSocketConnected, isEnabled: isWebSocketEnabled, onProactiveMessage } = useWebSocket();

  // Load chat history from local storage on mount
  useEffect(() => {
    const storedMessages = localStorage.getItem('chat_messages');
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }
    setIsInitialising(false);
  }, []);

  // Save chat history to local storage whenever messages change
  useEffect(() => {
    localStorage.setItem('chat_messages', JSON.stringify(messages));
  }, [messages]);

  // Handle proactive messages in chat
  useEffect(() => {
    const unsubscribe = onProactiveMessage((proactiveMessage: ProactiveMessage) => {
      logger.info('Received proactive message in chat:', proactiveMessage);
      
      // Convert proactive message to chat message format
      const chatMessage: Message = {
        id: proactiveMessage.id,
        content: proactiveMessage.content,
        role: 'assistant',
        timestamp: proactiveMessage.timestamp,
        sender: proactiveMessage.sender,
        metadata: { isProactive: true, ...proactiveMessage.metadata }
      };
      
      // Add the message to the chat
      setMessages(prev => [...prev, chatMessage]);
      
      // Show a toast notification for proactive messages
      toast({
        title: `New message from ${proactiveMessage.sender}`,
        description: proactiveMessage.content.substring(0, 100) + (proactiveMessage.content.length > 100 ? '...' : ''),
      });
    });

    return unsubscribe;
  }, [onProactiveMessage, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('chat_messages');
    toast({
      title: "Chat cleared!",
      description: "All messages have been deleted.",
    })
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      id: uuidv4(),
      content: input,
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    addMessage(userMessage);
    setInput('');

    try {
      // Simple echo response for now - replace with actual AI integration
      const aiMessage: Message = {
        id: uuidv4(),
        content: `Echo: ${userMessage.content}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };
      
      addMessage(aiMessage);
      
      // Log the interaction to Supabase
      if (user) {
        try {
          const { error } = await supabase
            .from('chat_logs')
            .insert([
              {
                user_id: user.id,
                user_message: userMessage.content,
                ai_response: aiMessage.content,
                timestamp: new Date().toISOString(),
                metadata: {}
              },
            ]);
          
          if (error) {
            logger.error('Error logging chat interaction to Supabase:', error);
          }
        } catch (supabaseError: any) {
          logger.error('Unexpected error logging chat interaction to Supabase:', supabaseError);
        }
      }
    } catch (err: any) {
      logger.error('Error in sendMessage:', err);
      setError(err.message || 'Failed to send message');
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was an error sending your message. Please try again.",
      })
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    message: input, // alias for compatibility
    isLoading,
    isInitialising,
    error,
    handleInputChange,
    setMessage: setInput, // alias for compatibility
    handleSubmit: sendMessage, // alias for compatibility
    sendMessage,
    clearChat,
    handleClearChat: clearChat, // alias for compatibility
    handleExportChat: () => {}, // placeholder
    startChat: () => {}, // placeholder
    setMessages,
    addMessage,
    isWebSocketConnected,
    isWebSocketEnabled,
    handleAbortRequest: () => {}, // placeholder
    getCurrentRequestInfo: () => null, // placeholder
    hasActiveRequest: () => false, // placeholder
  };
};
