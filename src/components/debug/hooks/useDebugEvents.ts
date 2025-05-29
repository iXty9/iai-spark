
import { useEffect } from 'react';

const logTypes = ['log','warn','info','error'] as const;

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
      addLog(e.detail.lastAction||'Debug event');
      setState((s: any) => { 
        const ns = {...s,...e.detail,timestamp:nowISO()}; 
        window.debugState = ns; 
        return ns;
      }); 
    }],
    ['webhookCall', (e: any) => {
      if(e.detail.status==='RESPONSE_RECEIVED'){ 
        // setWebhookResp(e.detail.responseData); 
        addLog(`Webhook response: ${e.detail.webhookType||'Unknown'}`)
      } 
    }],
    ['supabaseConnection', (e: any) => {
      const d = e.detail; 
      addLog(`Supabase connection: ${d.status}${d.error?'(Error: '+d.error+')':''}`);
      setState((s: any) => { 
        const ns = {
          ...s,
          supabaseInfo: {
            ...s.supabaseInfo,
            ...d, 
            lastConnectionAttempt: d.timestamp||nowISO(),
            retryCount: d.status==='connecting' ? (s.supabaseInfo.retryCount||0)+1 : s.supabaseInfo.retryCount,
            isInitialized: d.status==='connected'
          },
          timestamp: nowISO()
        }; 
        window.debugState = ns; 
        return ns; 
      });
    }],
    ['bootstrapProcess', (e: any) => {
      const d = e.detail; 
      addLog(`Bootstrap: ${d.stage}${d.error?'(Error: '+d.error+')':''}`);
      setState((s: any) => { 
        const steps = [...(s.bootstrapInfo.steps||[])]; 
        if (d.step) steps.push(d.step);
        const ns = {
          ...s,
          bootstrapInfo: {
            ...s.bootstrapInfo, 
            stage: d.stage, 
            startTime: s.bootstrapInfo.startTime||d.timestamp||nowISO(), 
            completionTime: d.stage==='completed'?(d.timestamp||nowISO()):s.bootstrapInfo.completionTime, 
            steps, 
            lastError: d.error||s.bootstrapInfo.lastError
          },
          timestamp: nowISO()
        }; 
        window.debugState = ns; 
        return ns; 
      }); 
    }]
  ];

  useEffect(() => {
    if (!isDevMode) return;

    logTypes.forEach(type => {
      const fn = (console as any)[type];
      (console as any)[type] = function(...args: any[]) {
        addConsole(type, args);
        fn.apply(console, args);
      };
    });
    
    events.forEach(([eventName, callback]) => {
      window.addEventListener(eventName, callback as EventListener);
    });
    
    return () => { 
      events.forEach(([eventName, callback]) => {
        window.removeEventListener(eventName, callback as EventListener);
      }); 
      logTypes.forEach(type => {
        (console as any)[type] = (console as any)['_'+type];
      }); 
    }
    // eslint-disable-next-line
  }, [isDevMode]);

  // Store orig. console (preserve only once)
  useEffect(() => { 
    if (!isDevMode) return;
    logTypes.forEach(t => (console as any)['_'+t] = (console as any)[t]); 
    return () => {}; 
  }, [isDevMode]);
};
