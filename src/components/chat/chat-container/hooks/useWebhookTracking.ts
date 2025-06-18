
import { useState, useEffect } from 'react';

export const useWebhookTracking = (isDevMode: boolean) => {
  const [lastWebhookCall, setLastWebhookCall] = useState<string | null>(null);

  useEffect(() => {
    if (!isDevMode) return;

    const handler = (e: any) => {
      const url = e?.detail?.webhookUrl;
      if (url) setLastWebhookCall(`Using ${url.includes('9553f3d014f7') ? 'AUTHENTICATED' : 'ANONYMOUS'} webhook`);
    };
    window.addEventListener('webhookCall', handler);
    
    return () => {
      window.removeEventListener('webhookCall', handler);
    };
  }, [isDevMode]);

  return { lastWebhookCall };
};
