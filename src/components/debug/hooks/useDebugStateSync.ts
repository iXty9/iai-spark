
import { useEffect } from 'react';
import { Message } from '@/types/chat';
import { domManagerService } from '@/services/global/dom-manager-service';

interface UseDebugStateSyncProps {
  isDevMode: boolean;
  setState: (updater: (state: any) => any) => void;
  messages: Message[];
  isLoading: boolean;
  hasInteracted: boolean;
  message: string;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  fps: number;
  lastWebhookCall: string | null;
  lastWebhookResponse: any;
}

export const useDebugStateSync = ({
  isDevMode,
  setState,
  messages,
  isLoading,
  hasInteracted,
  message,
  isAuthLoading,
  isAuthenticated,
  fps,
  lastWebhookCall,
  lastWebhookResponse
}: UseDebugStateSyncProps) => {
  useEffect(() => {
    if (!isDevMode) return;

    const connectionStatus = isAuthenticated ? 'connected' : 
                           isAuthLoading ? 'connecting' : 
                           'disconnected';
    
    const getEnvironment = () => {
      try {
        let storedEnv = localStorage.getItem('supabase_environment_local');
        
        if (storedEnv && storedEnv.startsWith('{')) {
          const envObj = JSON.parse(storedEnv);
          storedEnv = envObj.id || envObj.type || null;
        }
        
        return storedEnv || 
               (window.location.hostname === 'localhost' ? 'development' : 'production');
      } catch (e) {
        return window.location.hostname === 'localhost' ? 'development' : 'production';
      }
    };

    const viewportInfo = domManagerService.getViewportInfo();

    setState((s: any) => ({
      ...s,
      screen: messages.length === 0 ? 'Welcome Screen' : 'Chat Screen',
      messagesCount: messages.length,
      isLoading,
      hasInteracted,
      lastWebhookCall,
      lastWebhookResponse,
      inputState: isLoading ? 'Disabled' : message.trim() ? 'Ready to Send' : 'Empty',
      authState: isAuthLoading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated',
      routeInfo: {
        pathname: window.location.pathname,
        fullUrl: window.location.href,
        search: window.location.search,
        hash: window.location.hash
      },
      supabaseInfo: {
        ...s.supabaseInfo,
        connectionStatus,
        authStatus: isAuthenticated ? 'authenticated' : 'unauthenticated',
        environment: getEnvironment(),
        isInitialized: isAuthenticated
      },
      browserInfo: {
        ...s.browserInfo,
        viewport: { width: viewportInfo.width, height: viewportInfo.height }
      },
      performanceInfo: {
        ...s.performanceInfo,
        memory: performance?.memory ? { 
          usedJSHeapSize: performance.memory.usedJSHeapSize, 
          totalJSHeapSize: performance.memory.totalJSHeapSize 
        } : undefined, 
        fps
      },
      domInfo: {
        bodyChildren: document.body?.children.length || 0,
        totalElements: document.getElementsByTagName('*').length,
        inputElements: document.getElementsByTagName('input').length
      }
    }));
  }, [messages.length, isLoading, hasInteracted, message, isAuthLoading, isAuthenticated, fps, lastWebhookCall, lastWebhookResponse, isDevMode, setState]);
};
