
import React from 'react';
import { MessageContent as BaseMessageContent } from './message/MessageContent';
import { Message } from '@/types/chat';

interface MessageContentProps {
  content: string;
  message?: Message;
}

export const MessageContent: React.FC<MessageContentProps> = ({ content, message }) => {
  // Create a message object for the base component
  const messageObj: Message = message || {
    id: '',
    sender: 'ai',
    content,
    timestamp: new Date().toISOString()
  };

  return <BaseMessageContent message={messageObj} isUser={messageObj.sender === 'user'} />;
};
