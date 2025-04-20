
import React from 'react';
import { DebugInfo } from '@/types/chat';

interface ChatDebugOverlayProps {
  debugInfo: DebugInfo;
}

export const ChatDebugOverlay: React.FC<ChatDebugOverlayProps> = ({ debugInfo }) => {
  if (!debugInfo.isIOSSafari) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        fontSize: '10px',
        padding: '4px',
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    >
      <div>Messages: {debugInfo.messageCount}</div>
      <div>Input visible: {debugInfo.inputVisible ? 'Yes' : 'No'}</div>
      <div>Viewport: {debugInfo.viewportHeight}px</div>
      <div>
        Input pos: T{debugInfo.inputPosition.top.toFixed(0)} 
        B{debugInfo.inputPosition.bottom.toFixed(0)}
      </div>
      <div>
        Style: {debugInfo.computedStyles.position} {debugInfo.computedStyles.display} 
        h:{debugInfo.computedStyles.height}
      </div>
      <div>
        Parent: {debugInfo.parentInfo.position} {debugInfo.parentInfo.overflow} 
        h:{debugInfo.parentInfo.height}
      </div>
    </div>
  );
};
