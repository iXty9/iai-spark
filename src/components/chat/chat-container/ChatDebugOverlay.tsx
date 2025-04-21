
import React from 'react';
import { DebugInfo } from '@/types/chat';

interface ChatDebugOverlayProps {
  debugInfo: DebugInfo;
}

export const ChatDebugOverlay: React.FC<ChatDebugOverlayProps> = ({ debugInfo }) => {
  // This component is now disabled/empty to remove the mobile debug overlay
  return null;
};
