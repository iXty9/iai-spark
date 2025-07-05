
import React, { useRef } from 'react';
import { UserMenu } from '@/components/UserMenu';
import { importChat } from '@/services/import/importService';
import { HeaderLogo } from './header/HeaderLogo';
import { HeaderActions } from './header/HeaderActions';
import { LocationStatusIndicator } from '@/components/location/LocationStatusIndicator';

interface ChatHeaderProps {
  onClearChat: () => void;
  onExportChat: () => void;
  onImportChat: (messages: any[]) => void;
  onReloadTheme?: () => void;
  hasMessages?: boolean;
  dynamicPadding?: {
    left: number;
    right: number;
  };
  isMobile?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  onClearChat, 
  onExportChat,
  onImportChat,
  onReloadTheme,
  hasMessages = false,
  dynamicPadding = { left: 0, right: 0 },
  isMobile = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const messages = await importChat(file);
      onImportChat(messages);
    } catch (error) {
      console.error('Import failed:', error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <header className="py-3 flex items-center justify-between min-h-[3rem]">
      <HeaderLogo 
        isMobile={isMobile} 
        dynamicPadding={{ left: 0 }}
      />
      
      <div className="flex items-center gap-3 flex-shrink-0">
        <LocationStatusIndicator variant="compact" />
        <UserMenu />
        
        <HeaderActions
          onClearChat={onClearChat}
          onExportChat={onExportChat}
          onImportChat={onImportChat}
          onReloadTheme={onReloadTheme}
          onImportClick={handleImportClick}
          hasMessages={hasMessages}
          dynamicPadding={{ right: 0 }}
          isMobile={isMobile}
        />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />
      </div>
    </header>
  );
};
