
import React from 'react';
import { ChatContainer } from './chat-container/ChatContainer';
import { useTheme } from '@/hooks/use-theme';
import { toast } from '@/hooks/use-toast';
import { forceReloadSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';

interface ChatProps {
  isThemeLoading?: boolean;
}

export const Chat: React.FC<ChatProps> = ({ isThemeLoading = false }) => {
  const { theme, reloadTheme, isThemeLoaded } = useTheme();
  
  // Function to reload theme by toggling light/dark mode and back
  const handleReloadTheme = async () => {
    try {
      // Log that we're handling the reload request
      logger.info('Chat component handling reload theme request', { module: 'chat' });
      
      // Fetch new settings first to ensure we have latest
      const settings = await forceReloadSettings();
      
      if (settings && settings.default_theme_settings) {
        logger.info('Found default theme in settings during manual reload', { 
          module: 'chat',
          settingsKeys: Object.keys(settings)
        });
      } else {
        logger.warn('No default theme found in settings during manual reload', { 
          module: 'chat' 
        });
      }
      
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
      
      toast({
        variant: "destructive",
        title: "Theme Load Failed",
        description: "Could not load default theme settings",
        duration: 3000,
      });
    }
  };
  
  return (
    <ChatContainer 
      className="bg-transparent" 
      onReloadTheme={handleReloadTheme}
      isThemeLoading={isThemeLoading}
    />
  );
};
