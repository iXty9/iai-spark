
import React from 'react';
import { CollapsibleHeader } from '../CollapsibleHeader';
import { Message } from '@/types/chat';

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
    <div className="chat-container flex flex-col h-full overflow-hidden">
      <CollapsibleHeader 
        onClearChat={onClearChat}
        onExportChat={onExportChat}
        onImportChat={onImportChat}
      />
      {children}
    </div>
  );
};
