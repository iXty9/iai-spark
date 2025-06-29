
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/hooks/use-toast"
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket, ProactiveMessage } from '@/contexts/WebSocketContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { processMessage } from '@/services/chat/message-processor';
import { Message } from '@/types/chat'; // Use the complete Message interface

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
        sender: 'ai',
        timestamp: proactiveMessage.timestamp,
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

  const startChat = useCallback(async (initialMessage: string) => {
    if (!initialMessage.trim()) return;

    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      id: uuidv4(),
      content: initialMessage,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    addMessage(userMessage);

    try {
      // Use the real message processor instead of echo
      const aiResponse = await processMessage({
        message: initialMessage,
        isAuthenticated: !!user,
        userProfile: user ? {
          username: user.user_metadata?.username,
          first_name: user.user_metadata?.first_name,
          last_name: user.user_metadata?.last_name
        } : null,
        onError: (error) => {
          logger.error('Error in AI response:', error);
          setError(error.message || 'Failed to get AI response');
        }
      });

      // Convert the enhanced response to our message format, preserving all data
      const aiMessage: Message = {
        id: aiResponse.id,
        content: aiResponse.content,
        sender: 'ai',
        timestamp: aiResponse.timestamp,
        metadata: aiResponse.metadata,
        tokenInfo: aiResponse.tokenInfo,
        threadId: aiResponse.threadId,
        rawRequest: aiResponse.rawRequest,
        rawResponse: aiResponse.rawResponse
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
      logger.error('Error in startChat:', err);
      setError(err.message || 'Failed to start chat');
      
      // Add error message to chat
      const errorMessage: Message = {
        id: uuidv4(),
        content: "I'm sorry, but I encountered an error processing your message. Please try again.",
        sender: 'ai',
        timestamp: new Date().toISOString(),
        metadata: { error: true }
      };
      addMessage(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was an error starting the chat. Please try again.",
      })
    } finally {
      setIsLoading(false);
    }
  }, [user, addMessage, toast]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      id: uuidv4(),
      content: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    addMessage(userMessage);
    setInput('');

    try {
      // Use the real message processor instead of echo
      const aiResponse = await processMessage({
        message: userMessage.content,
        isAuthenticated: !!user,
        userProfile: user ? {
          username: user.user_metadata?.username,
          first_name: user.user_metadata?.first_name,
          last_name: user.user_metadata?.last_name
        } : null,
        onError: (error) => {
          logger.error('Error in AI response:', error);
          setError(error.message || 'Failed to get AI response');
        }
      });

      // Convert the enhanced response to our message format, preserving all data
      const aiMessage: Message = {
        id: aiResponse.id,
        content: aiResponse.content,
        sender: 'ai',
        timestamp: aiResponse.timestamp,
        metadata: aiResponse.metadata,
        tokenInfo: aiResponse.tokenInfo,
        threadId: aiResponse.threadId,
        rawRequest: aiResponse.rawRequest,
        rawResponse: aiResponse.rawResponse
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
      
      // Add error message to chat
      const errorMessage: Message = {
        id: uuidv4(),
        content: "I'm sorry, but I encountered an error processing your message. Please try again.",
        sender: 'ai',
        timestamp: new Date().toISOString(),
        metadata: { error: true }
      };
      addMessage(errorMessage);
      
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
    startChat, // Now properly implemented
    setMessages,
    addMessage,
    isWebSocketConnected,
    isWebSocketEnabled,
    handleAbortRequest: () => {}, // placeholder
    getCurrentRequestInfo: () => null, // placeholder
    hasActiveRequest: () => false, // placeholder
  };
};
