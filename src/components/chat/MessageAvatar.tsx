
import React from 'react';
import { MessageAvatar as BaseMessageAvatar } from './message/MessageAvatar';

interface MessageAvatarProps {
  sender: 'user' | 'ai';
}

export const MessageAvatar: React.FC<MessageAvatarProps> = ({ sender }) => {
  return <BaseMessageAvatar isUser={sender === 'user'} />;
};
