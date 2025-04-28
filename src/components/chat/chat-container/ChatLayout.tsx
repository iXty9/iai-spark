
import React from 'react';
import { Message } from '@/types/chat';
import { ChatHeader } from '../ChatHeader';
import { ImportChatButton } from '../ImportChatButton';

interface ChatLayoutProps {
  children: React.ReactNode;
  onClearChat: () => void;
  onExportChat: () => void;
  onImportChat: (messages: Message[]) => void;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  children,
  onClearChat,
  onExportChat,
  onImportChat
}) => {
  return (
    <div className="flex flex-col h-full relative bg-background">
      <ChatHeader
        onClearChat={onClearChat}
        onExportChat={onExportChat}
        onImportChat={onImportChat}
      />
      {children}
    </div>
  );
};
