
import React from 'react';
import { ChatHeader } from '../ChatHeader';
import { Message } from '@/types/chat';

interface CollapsibleHeaderProps {
  onClearChat: () => void;
  onExportChat: () => void;
  onImportChat: (messages: Message[]) => void;
  onReloadTheme?: () => void;
  messages: Message[];
}

interface ChatLayoutProps extends CollapsibleHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  children,
  className = '',
  onClearChat,
  onExportChat,
  onImportChat,
  onReloadTheme,
  messages,
}) => {
  return (
    <div className={`h-full flex flex-col ${className}`}>
      <ChatHeader 
        onClearChat={onClearChat} 
        onExportChat={onExportChat} 
        onImportChat={onImportChat}
        onReloadTheme={onReloadTheme}
        hasMessages={messages.length > 0} 
      />
      {children}
    </div>
  );
};
