
import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ChatHeader } from './ChatHeader';
import { Message as MessageType } from '@/types/chat';
import { sendMessage, exportChat } from '@/services/chatService';
import { toast } from '@/components/ui/sonner';

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: MessageType = {
      id: uuidv4(),
      content,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    // Add a timeout warning after 30 seconds
    const timeoutWarning = setTimeout(() => {
      toast.info("Ixty AI is still thinking. This might take a moment...");
    }, 30000);

    try {
      // Send to API and get response
      const aiResponse = await sendMessage(content);
      
      // Add AI response message
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
      clearTimeout(timeoutWarning);
      setIsTyping(false);
    }
  }, []);

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

  return (
    <div className="chat-container">
      <ChatHeader
        onClearChat={handleClearChat}
        onExportChat={handleExportChat}
      />
      
      <MessageList 
        messages={messages} 
        isTyping={isTyping} 
        onStartChat={handleSendMessage}
      />
      
      <MessageInput
        onSendMessage={handleSendMessage}
        isTyping={isTyping}
      />
    </div>
  );
};

