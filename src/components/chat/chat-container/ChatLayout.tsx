
import React from 'react';
import { CollapsibleHeader } from '../CollapsibleHeader';

interface ChatLayoutProps {
  children: React.ReactNode;
  onClearChat: () => void;
  onExportChat: () => void;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ 
  children, 
  onClearChat, 
  onExportChat 
}) => {
  return (
    <div className="chat-container flex flex-col h-full overflow-hidden">
      <CollapsibleHeader 
        onClearChat={onClearChat}
        onExportChat={onExportChat}
      />
      {children}
    </div>
  );
};
