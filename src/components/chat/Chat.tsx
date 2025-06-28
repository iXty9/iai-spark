
import React from 'react';
import { ChatContainer } from '@/components/chat/chat-container/ChatContainer';
import { MobileSafariErrorBoundary } from '@/components/error/MobileSafariErrorBoundary';

export const Chat: React.FC = () => {
  return (
    <MobileSafariErrorBoundary>
      <ChatContainer />
    </MobileSafariErrorBoundary>
  );
};
