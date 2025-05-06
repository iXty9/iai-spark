
import React from 'react';
import { CollapsibleHeader } from '../CollapsibleHeader';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  children: React.ReactNode;
  onClearChat: () => void;
  onExportChat: () => void;
  onImportChat: (messages: Message[]) => void;
  onReloadTheme?: () => void;
  messages?: Message[];
  className?: string;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ 
  children, 
  onClearChat, 
  onExportChat,
  onImportChat,
  onReloadTheme,
  messages = [],
  className
}) => {
  return (
    <div className={cn("chat-container flex flex-col h-full overflow-hidden bg-transparent", className)}>
      <CollapsibleHeader 
        onClearChat={onClearChat}
        onExportChat={onExportChat}
        onImportChat={onImportChat}
        onReloadTheme={onReloadTheme}
        messages={messages}
      />
      {children}
    </div>
  );
};
