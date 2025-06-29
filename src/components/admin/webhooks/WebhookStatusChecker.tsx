
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Globe, AlertCircle, Clock } from 'lucide-react';
import { WebhookSettings } from './WebhookValidation';

interface WebhookStatus {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking' | 'not-configured' | 'unknown';
  lastChecked?: Date;
  error?: string;
}

interface WebhookStatusCheckerProps {
  settings: WebhookSettings;
}

export function WebhookStatusChecker({ settings }: WebhookStatusCheckerProps) {
  const [statuses, setStatuses] = useState<WebhookStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const webhookConfigs = [
    { key: 'authenticated_webhook_url', name: 'Authenticated Webhook' },
    { key: 'anonymous_webhook_url', name: 'Anonymous Webhook' },
    { key: 'debug_webhook_url', name: 'Debug Webhook' },
    { key: 'thumbs_up_webhook_url', name: 'Thumbs Up Webhook' },
    { key: 'thumbs_down_webhook_url', name: 'Thumbs Down Webhook' },
    { key: 'user_signup_webhook_url', name: 'User Signup Webhook' }
  ];

  const checkWebhookStatus = async (url: string): Promise<'online' | 'offline' | 'unknown'> => {
    if (!url) return 'unknown';
    
    try {
      // Try a lightweight OPTIONS request first, then fall back to HEAD
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      try {
        const response = await fetch(url, {
          method: 'OPTIONS',
          signal: controller.signal,
          mode: 'no-cors'
        });
        clearTimeout(timeoutId);
        return 'online';
      } catch (optionsError) {
        // Try HEAD request as fallback
        const headResponse = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors'
        });
        clearTimeout(timeoutId);
        return 'online';
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'offline'; // Timeout
      }
      // For CORS or other network errors, we can't determine the real status
      // but the webhook might still work from server-side calls
      return 'unknown';
    }
  };

  const checkAllWebhooks = async () => {
    setIsChecking(true);
    
    const newStatuses: WebhookStatus[] = await Promise.all(
      webhookConfigs.map(async (config) => {
        const url = settings[config.key as keyof WebhookSettings];
        
        if (!url) {
          return {
            name: config.name,
            url: '',
            status: 'not-configured' as const,
            lastChecked: new Date()
          };
        }

        const status = await checkWebhookStatus(url);
        
        return {
          name: config.name,
          url,
          status,
          lastChecked: new Date()
        };
      })
    );

    setStatuses(newStatuses);
    setIsChecking(false);
  };

  useEffect(() => {
    checkAllWebhooks();
  }, [settings]);

  const getStatusBadge = (status: WebhookStatus['status']) => {
    switch (status) {
      case 'online':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Online</Badge>;
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>;
      case 'checking':
        return <Badge variant="secondary">Checking...</Badge>;
      case 'not-configured':
        return <Badge variant="outline">Not Configured</Badge>;
      case 'unknown':
        return <Badge variant="secondary">Unknown</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: WebhookStatus['status']) => {
    switch (status) {
      case 'online':
        return <Globe className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <RefreshCw className="h-4 w-4 text-gray-500 animate-spin" />;
      case 'not-configured':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'unknown':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  return (
    <Alert className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="font-medium">Webhook Status Monitor</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkAllWebhooks}
          disabled={isChecking}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Check All'}
        </Button>
      </div>
      
      <AlertDescription>
        <div className="space-y-3">
          {statuses.map((webhook, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      {getStatusIcon(webhook.status)}
                    </TooltipTrigger>
                    <TooltipContent>
                      {webhook.status === 'unknown' && 'Status cannot be determined due to CORS restrictions, but webhook may still work'}
                      {webhook.status === 'online' && 'Webhook endpoint is responding'}
                      {webhook.status === 'offline' && 'Webhook endpoint is not responding or timed out'}
                      {webhook.status === 'not-configured' && 'No URL configured for this webhook'}
                      {webhook.status === 'checking' && 'Currently checking webhook status...'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{webhook.name}</div>
                  {webhook.url && (
                    <div className="text-xs text-muted-foreground truncate" title={webhook.url}>
                      {truncateUrl(webhook.url)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusBadge(webhook.status)}
                {webhook.lastChecked && (
                  <span className="text-xs text-muted-foreground">
                    {webhook.lastChecked.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          ))}
          
          <div className="text-xs text-muted-foreground mt-4 p-2 bg-muted/20 rounded">
            <strong>Note:</strong> Status checks are performed from your browser. Some webhooks may show "Unknown" due to CORS restrictions, 
            but they will still work when called from the server. This monitor helps identify obviously broken endpoints.
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
