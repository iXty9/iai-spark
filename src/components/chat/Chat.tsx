
import React from 'react';
import { ChatContainer } from './chat-container/ChatContainer';
import { useTheme } from '@/hooks/use-theme';
import { toast } from '@/hooks/use-toast';
import { forceReloadSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';

export const Chat = () => {
  const { theme, reloadTheme } = useTheme();
  
  // Function to reload theme by toggling light/dark mode and back
  const handleReloadTheme = () => {
    try {
      // Log that we're handling the reload request
      logger.info('Chat component handling reload theme request', { module: 'chat' });
      
      // Call the reload function from useTheme hook
      reloadTheme();
      
      toast({
        title: "Theme Reload Triggered",
        description: "Theme reload has been triggered",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error during theme reload:', error);
      logger.error('Error during theme reload in Chat component', error, { module: 'chat' });
    }
  };
  
  return (
    <ChatContainer 
      className="bg-transparent" 
      onReloadTheme={handleReloadTheme}
    />
  );
};
