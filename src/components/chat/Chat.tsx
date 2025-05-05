
import React, { useEffect } from 'react';
import { ChatContainer } from './chat-container/ChatContainer';
import { useTheme } from '@/contexts/ThemeContext';
import { logger } from '@/utils/logging';

export const Chat = () => {
  const { refreshTheme } = useTheme();
  
  // Ensure theme is properly initialized when chat loads
  useEffect(() => {
    logger.info('Chat component mounted, refreshing theme', { module: 'chat' });
    // Refresh theme to ensure it's properly applied after navigation
    refreshTheme();
  }, [refreshTheme]);
  
  return <ChatContainer className="bg-transparent" />;
};
