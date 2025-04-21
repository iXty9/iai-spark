
// Update the useChat hook to include functionality to restore chat from session storage
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMessageState } from './chat/use-message-state';
import { Message } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

export const useChat = () => {
  // Get auth state for chat submission
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Use message state from the dedicated hook
  const {
    messages,
    setMessages,
    message,
    setMessage,
    isLoading,
    setIsLoading,
    addMessage,
    clearMessages,
    resetState
  } = useMessageState();
  
  // Add error state which was missing
  const [error, setError] = useState<string | null>(null);

  // Function to restore messages from session storage
  const restoreMessages = useCallback(() => {
    try {
      const storedMessages = sessionStorage.getItem('chatMessages');
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages);
        // Ensure timestamps are converted back to Date objects
        const restoredMessages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(restoredMessages);
        return true;
      }
    } catch (error) {
      console.error('Error restoring messages:', error);
      toast.error('Failed to restore chat history');
    }
    return false;
  }, [setMessages]);

  // Initialize by checking for stored messages
  useEffect(() => {
    if (messages.length === 0) {
      restoreMessages();
    }
  }, [messages.length, restoreMessages]);

  // Fixed handleSubmit to properly send messages
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: uuidv4(),
      content: message.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    // Add the user message to the chat
    addMessage(userMessage);
    setMessage('');
    setIsLoading(true);
    setError(null);

    try {
      // Simulate AI response (this would be replaced with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a mock response
      const aiResponse = {
        response: `I received your message: "${userMessage.content}"`,
        rawResponse: null,
        tokenInfo: null,
        threadId: null,
        metadata: null
      };
      
      // Add the AI response to the chat
      addMessage({
        id: uuidv4(),
        content: aiResponse.response,
        sender: 'ai',
        timestamp: new Date(),
        rawResponse: aiResponse.rawResponse,
        tokenInfo: aiResponse.tokenInfo,
        threadId: aiResponse.threadId,
        metadata: aiResponse.metadata
      });
    } catch (error) {
      console.error('Error submitting message:', error);
      setError('Failed to get a response. Please try again.');
      
      // Add error message to chat
      addMessage({
        id: uuidv4(),
        content: "I'm sorry, but I encountered an error processing your message. Please try again.",
        sender: 'ai',
        timestamp: new Date(),
        metadata: { error: true }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    clearMessages();
    sessionStorage.removeItem('chatMessages');
    sessionStorage.removeItem('hasStartedChat');
  };

  const handleExportChat = () => {
    // Implementation for exporting chat
    const chatHistory = messages.map(msg => ({
      role: msg.sender,
      content: msg.content,
      timestamp: msg.timestamp.toISOString()
    }));
    
    const blob = new Blob([JSON.stringify(chatHistory, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const startChat = () => {
    // Mark that chat has started
    sessionStorage.setItem('hasStartedChat', 'true');
  };

  return {
    messages,
    message,
    setMessage,
    isLoading,
    error,
    handleSubmit,
    handleClearChat,
    handleExportChat,
    startChat,
    restoreMessages
  };
};
