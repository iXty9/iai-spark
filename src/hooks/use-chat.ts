import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/hooks/use-toast"
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCompletion } from 'ai/react';
import { trackEvent } from '@/utils/analytics';
import { logger } from '@/utils/logging';
import { useSettings } from '@/contexts/SettingsContext';
import { useWebSocketConnection } from './chat/use-websocket-connection';

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
  const { complete, completion, setCompletion } = useCompletion({
    api: '/api/completion'
  });
	const { settings } = useSettings();

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
      trackEvent('chat_message_sent', { userId: user?.id });
      
      const aiResponse = await complete(input);
      
      const aiMessage: Message = {
        id: uuidv4(),
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };
      
      addMessage(aiMessage);
      
      // Log the interaction to Supabase
      if (user) {
        try {
          const { data, error } = await supabase
            .from('chat_logs')
            .insert([
              {
                user_id: user.id,
                user_message: userMessage.content,
                ai_response: aiMessage.content,
                timestamp: new Date().toISOString(),
                metadata: {
                  theme: settings?.theme
                }
              },
            ]);
          
          if (error) {
            logger.error('Error logging chat interaction to Supabase:', error);
          } else {
            logger.info('Chat interaction logged to Supabase', { chatLogId: data?.[0]?.id });
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

  // Add WebSocket connection
  const { isConnected: isWebSocketConnected, isEnabled: isWebSocketEnabled } = useWebSocketConnection(
    (message) => {
      // Handle incoming proactive messages
      console.log('Received proactive message via WebSocket:', message);
      
      // Add the message to the chat
      setMessages(prev => [...prev, message]);
      
      // Show a toast notification for proactive messages
      toast({
        title: `New message from ${message.sender || 'System'}`,
        description: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
      });
    }
  );

  return {
    messages,
    input,
    isLoading,
    isInitialising,
    error,
    handleInputChange,
    sendMessage,
    clearChat,
    isWebSocketConnected,
    isWebSocketEnabled,
  };
};
