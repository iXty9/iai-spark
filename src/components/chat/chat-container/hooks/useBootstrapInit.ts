
import { useEffect } from 'react';
import { emitBootstrapEvent } from '@/utils/debug/supabase-debug';
import { collectEnvironmentInfo } from '@/utils/debug/environment-debug';

export const useBootstrapInit = (isDevMode: boolean, isAuthenticated: boolean) => {
  useEffect(() => {
    if (!isDevMode) return;
    
    const bootstrapState = localStorage.getItem('supabase_bootstrap_state');
    const isBootstrapInitialized = bootstrapState && 
      JSON.parse(bootstrapState).stage !== 'not_started' && 
      JSON.parse(bootstrapState).stage !== 'failed';
    
    if (!isBootstrapInitialized) {
      emitBootstrapEvent('initializing');
    }
    
    if (typeof window !== 'undefined') {
      (window as any).supabaseConnectionStartTime = performance.now();
    }
    
    collectEnvironmentInfo();
    
    const authState = isAuthenticated ? 'authenticated' : 'unauthenticated';
    window.dispatchEvent(new CustomEvent('chatDebug', { 
      detail: { 
        supabaseInfo: {
          authStatus: authState,
          lastAuthChange: new Date().toISOString()
        }
      }
    }));
    
    const completeBootstrap = setTimeout(() => {
      emitBootstrapEvent('completed');
    }, 2000);
    
    return () => {
      clearTimeout(completeBootstrap);
    };
  }, [isAuthenticated, isDevMode]);
};
