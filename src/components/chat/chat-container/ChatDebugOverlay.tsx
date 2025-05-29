
import React from 'react';
import { DebugInfo } from '@/types/chat';

interface ChatDebugOverlayProps {
  debugInfo: DebugInfo;
}

// This component was simplified as it only returns null
// Removing the unused DebugInfo import and props since debug overlay is disabled
export const ChatDebugOverlay: React.FC<ChatDebugOverlayProps> = ({ debugInfo }) => {
  return null;
};
