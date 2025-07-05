
import { useState } from 'react';
import { toast } from "@/hooks/use-toast";
import { sendDebugInfo } from '@/utils/debug/webhook-debug';

interface UseDebugPanelActionsProps {
  state: any;
  logs: Array<{timestamp: string, message: string}>;
  consoleLogs: Array<{timestamp: string, type: string, message: string}>;
  setCopied: (copied: boolean) => void;
  setSending: (sending: boolean) => void;
  setSendingStatus: (status: string) => void;
  addLog: (message: string) => void;
  location?: any;
  profile?: any;
}

export const useDebugPanelActions = ({
  state,
  logs,
  consoleLogs,
  setCopied,
  setSending,
  setSendingStatus,
  addLog,
  location,
  profile
}: UseDebugPanelActionsProps) => {
  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(console.error);
  };
  
  const send = async() => {
    setSending(true);
    setSendingStatus('Preparing bug report...');
    
    try {
      const dbg = window.debugState || state;
      const kf = (k: string) => k.startsWith('app:') || k.startsWith('supabase') || k.startsWith('sb-');
      const info = {
        ...dbg, 
        timestamp: new Date().toISOString(), 
        logs: logs.slice(0, 20), 
        consoleLogs: consoleLogs.slice(0, 50),
        userAgent: state.browserInfo.userAgent, 
        url: window.location.href,
        localStorage: { 
          keys: Object.keys(localStorage).filter(kf), 
          totalItems: localStorage.length 
        },
        sessionStorage: { 
          keys: Object.keys(sessionStorage).filter(kf), 
          totalItems: sessionStorage.length 
        },
        locationServices: location ? {
          isSupported: location.isSupported,
          hasPermission: location.hasPermission,
          isLoading: location.isLoading,
          error: location.error,
          currentLocation: location.currentLocation,
          lastUpdated: location.lastUpdated,
          autoUpdateEnabled: profile?.location_auto_update !== false
        } : null
      };
      
      setSendingStatus('Sending to development team...');
      const result = await sendDebugInfo(info);
      
      if(result.success) {
        setSendingStatus('');
        toast({title: "Bug Report Sent", description: "Successfully sent bug report to development team"}); 
        addLog("Bug report sent to development team");
      } else {
        throw new Error(result.error);
      }
    } catch(e: any) {
      setSendingStatus('');
      
      const isTimeout = e?.message?.includes('timeout') || e?.message?.includes('30 seconds');
      const errorTitle = isTimeout ? "Bug Report May Still Be Processing" : "Failed to Send Bug Report";
      const errorDesc = isTimeout ? 
        "The request timed out but may still complete in the background." : 
        e?.message;
      
      toast({
        variant: isTimeout ? "default" : "destructive", 
        title: errorTitle, 
        description: errorDesc
      }); 
      addLog(`Error sending bug report: ${e?.message}`);
    } finally {
      setSending(false);
      setSendingStatus('');
    }
  };

  return { copy, send };
};
