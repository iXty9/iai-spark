
// Mobile debug overlay fully removed (was already a stub returning null)
import React from 'react';
import { DebugInfo } from '@/types/chat';

interface ChatDebugOverlayProps {
  debugInfo: DebugInfo;
}

export const ChatDebugOverlay: React.FC<ChatDebugOverlayProps> = ({ debugInfo }) => {
  // Mobile debug overlay completely removed.
  return null;
};
