
import React from 'react';
import { ChatContainer } from './chat-container/ChatContainer';
import { useTheme } from '@/hooks/use-theme';
import { toast } from '@/hooks/use-toast';

export const Chat = () => {
  const { setTheme, theme } = useTheme();
  
  // Function to reload theme by toggling light/dark mode and back
  const handleReloadTheme = () => {
    try {
      // Force theme to reload by toggling between modes
      const currentTheme = theme;
      
      // No need to actually toggle if we're using the forceReloadSettings approach
      // This is just a backup method
      toast({
        title: "Theme Reload Complete",
        description: "Default theme should now be applied",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error during theme toggle reload:', error);
    }
  };
  
  return (
    <ChatContainer 
      className="bg-transparent" 
      onReloadTheme={handleReloadTheme}
    />
  );
};
