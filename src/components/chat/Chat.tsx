
import React, { useEffect } from 'react';
import { ChatContainer } from './chat-container/ChatContainer';
import { useTheme } from '@/hooks/use-theme';
import { logger } from '@/utils/logging';

export const Chat = () => {
  const { refreshTheme } = useTheme();
  
  // Ensure theme is properly initialized when chat loads
  useEffect(() => {
    logger.info('Chat component mounted, refreshing theme', { module: 'chat' });
    refreshTheme();
  }, [refreshTheme]);
  
  return <ChatContainer className="bg-transparent" />;
};
