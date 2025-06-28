
import React from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface WebSocketStatusIndicatorProps {
  className?: string;
}

export const WebSocketStatusIndicator: React.FC<WebSocketStatusIndicatorProps> = ({ className = '' }) => {
  const { isConnected, isEnabled } = useWebSocket();

  const getStatusIndicator = () => {
    if (!isEnabled) {
      return {
        color: 'bg-red-500',
        tooltip: 'Real-time messaging is disabled'
      };
    } else if (isConnected) {
      return {
        color: 'bg-green-500',
        tooltip: 'Connected to real-time updates'
      };
    } else {
      return {
        color: 'bg-gray-400',
        tooltip: 'Real-time messaging enabled but not connected'
      };
    }
  };

  const statusIndicator = getStatusIndicator();

  return (
    <div className={`${className}`}>
      <div 
        className={`w-2 h-2 rounded-full ${statusIndicator.color}`}
        title={statusIndicator.tooltip}
      />
    </div>
  );
};
