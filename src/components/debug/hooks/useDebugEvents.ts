
import { useEffect } from 'react';
import { logger } from '@/utils/logging';
import { globalStateService } from '@/services/debug/global-state-service';

export const useDebugEvents = (
  isDevMode: boolean,
  setState: any,
  addLog: (m: string) => void,
  addConsole: (type: string, args: any[]) => void,
  consoleLogs: any[]
) => {
  const nowISO = () => new Date().toISOString();

  const events: Array<[string, (e: any) => void]> = [
    ['chatDebug', (e: any) => { 
      addLog(e.detail.lastAction || 'Debug event');
      setState((s: any) => { 
        const newState = { ...s, ...e.detail, timestamp: nowISO() }; 
        globalStateService.updateDebugState(newState);
        return newState;
      }); 
    }],
    ['webhookCall', (e: any) => {
      if (e.detail.status === 'RESPONSE_RECEIVED') { 
        addLog(`Webhook response: ${e.detail.webhookType || 'Unknown'}`);
      } 
    }],
    ['supabaseConnection', (e: any) => {
      const d = e.detail; 
      addLog(`Supabase connection: ${d.status}${d.error ? '(Error: ' + d.error + ')' : ''}`);
      setState((s: any) => { 
        const newState = {
          ...s,
          supabaseInfo: {
            ...s.supabaseInfo,
            ...d, 
            lastConnectionAttempt: d.timestamp || nowISO(),
            retryCount: d.status === 'connecting' ? (s.supabaseInfo.retryCount || 0) + 1 : s.supabaseInfo.retryCount,
            isInitialized: d.status === 'connected'
          },
          timestamp: nowISO()
        }; 
        globalStateService.updateDebugState(newState);
        return newState; 
      });
    }],
    ['bootstrapProcess', (e: any) => {
      const d = e.detail; 
      addLog(`Bootstrap: ${d.stage}${d.error ? '(Error: ' + d.error + ')' : ''}`);
      setState((s: any) => { 
        const steps = [...(s.bootstrapInfo.steps || [])]; 
        if (d.step) steps.push(d.step);
        const newState = {
          ...s,
          bootstrapInfo: {
            ...s.bootstrapInfo, 
            stage: d.stage, 
            startTime: s.bootstrapInfo.startTime || d.timestamp || nowISO(), 
            completionTime: d.stage === 'completed' ? (d.timestamp || nowISO()) : s.bootstrapInfo.completionTime, 
            steps, 
            lastError: d.error || s.bootstrapInfo.lastError
          },
          timestamp: nowISO()
        }; 
        globalStateService.updateDebugState(newState);
        return newState; 
      }); 
    }]
  ];

  useEffect(() => {
    if (!isDevMode) return;

    // Enhanced console logging without patching original methods
    const logTypes = ['log', 'warn', 'info', 'error'] as const;
    const originalMethods = new Map();
    
    logTypes.forEach(type => {
      const originalMethod = (console as any)[type];
      originalMethods.set(type, originalMethod);
      
      (console as any)[type] = function(...args: any[]) {
        // Call original method first
        originalMethod.apply(console, args);
        
        // Add to debug console if dev mode is active
        if (isDevMode) {
          addConsole(type, args);
        }
      };
    });
    
    events.forEach(([eventName, callback]) => {
      window.addEventListener(eventName, callback as EventListener);
    });
    
    return () => { 
      events.forEach(([eventName, callback]) => {
        window.removeEventListener(eventName, callback as EventListener);
      }); 
      
      // Restore original console methods
      logTypes.forEach(type => {
        const originalMethod = originalMethods.get(type);
        if (originalMethod) {
          (console as any)[type] = originalMethod;
        }
      });
    };
    // eslint-disable-next-line
  }, [isDevMode, addLog, addConsole]);
};
