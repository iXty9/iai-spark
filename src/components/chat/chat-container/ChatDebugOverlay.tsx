
import React from 'react';
import { DebugInfo } from '@/types/chat';

interface ChatDebugOverlayProps {
  debugInfo: DebugInfo;
}

// Debug overlay simplified - no longer renders anything in production
// This eliminates the unnecessary component complexity
export const ChatDebugOverlay: React.FC<ChatDebugOverlayProps> = () => {
  return null;
};
