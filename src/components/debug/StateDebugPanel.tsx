
import React, { useEffect, useState } from 'react';
import { Message } from '@/types/chat';

interface DebugState {
  screen: string;
  messagesCount: number;
  isLoading: boolean;
  hasInteracted: boolean;
  isTransitioning: boolean;
  lastAction: string;
  lastError: string | null;
  timestamp: string;
  inputState: string;
  authState: string;
}

interface StateDebugPanelProps {
  messages: Message[];
  isLoading: boolean;
  hasInteracted: boolean;
  message: string;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
}

export const StateDebugPanel: React.FC<StateDebugPanelProps> = ({
  messages,
  isLoading,
  hasInteracted,
  message,
  isAuthLoading,
  isAuthenticated,
}) => {
  const [debugState, setDebugState] = useState<DebugState>({
    screen: 'Initializing...',
    messagesCount: 0,
    isLoading: false,
    hasInteracted: false,
    isTransitioning: false,
    lastAction: 'None',
    lastError: null,
    timestamp: new Date().toISOString(),
    inputState: 'Ready',
    authState: 'Unknown',
  });

  // Listen for custom events from the chat flow
  useEffect(() => {
    const handleDebugEvent = (e: CustomEvent) => {
      setDebugState(prev => ({
        ...prev,
        ...e.detail,
        timestamp: new Date().toISOString()
      }));
    };

    window.addEventListener('chatDebug' as any, handleDebugEvent);
    
    return () => {
      window.removeEventListener('chatDebug' as any, handleDebugEvent);
    };
  }, []);

  // Update state based on props
  useEffect(() => {
    setDebugState(prev => ({
      ...prev,
      screen: messages.length === 0 ? 'Welcome Screen' : 'Chat Screen',
      messagesCount: messages.length,
      isLoading,
      hasInteracted,
      inputState: isLoading ? 'Disabled' : message.trim() ? 'Ready to Send' : 'Empty',
      authState: isAuthLoading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated',
    }));
  }, [messages.length, isLoading, hasInteracted, message, isAuthLoading, isAuthenticated]);

  return (
    <div 
      className="fixed bottom-0 left-0 w-full bg-black/80 text-white p-2 z-[9999] font-mono text-xs"
      style={{ maxHeight: '40vh', overflow: 'auto' }}
    >
      <h3 className="font-bold text-red-400 mb-1">DEBUG PANEL - STATE TRANSITIONS</h3>
      <div className="grid grid-cols-2 gap-1">
        <div><span className="text-yellow-300">Current Screen:</span> {debugState.screen}</div>
        <div><span className="text-yellow-300">Messages Count:</span> {debugState.messagesCount}</div>
        <div><span className="text-yellow-300">Loading:</span> {debugState.isLoading.toString()}</div>
        <div><span className="text-yellow-300">Has Interacted:</span> {debugState.hasInteracted.toString()}</div>
        <div><span className="text-yellow-300">Transitioning:</span> {debugState.isTransitioning.toString()}</div>
        <div><span className="text-yellow-300">Input State:</span> {debugState.inputState}</div>
        <div><span className="text-yellow-300">Auth State:</span> {debugState.authState}</div>
        <div><span className="text-yellow-300">Last Action:</span> {debugState.lastAction}</div>
        {debugState.lastError && (
          <div className="col-span-2">
            <span className="text-red-400">Error:</span> {debugState.lastError}
          </div>
        )}
        <div className="col-span-2 text-gray-400 text-[10px]">
          {debugState.timestamp}
        </div>
      </div>
    </div>
  );
};
