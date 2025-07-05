
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Globe, AlertCircle, Clock, TestTube, Loader2 } from 'lucide-react';
import { WebhookSettings } from './WebhookValidation';
import { supaToast } from '@/services/supa-toast';
import { logger } from '@/utils/logging';

interface WebhookStatus {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking' | 'not-configured' | 'unknown';
  lastChecked?: Date;
  error?: string;
  webhookKey: string;
}

interface WebhookStatusCheckerProps {
  settings: WebhookSettings;
}

export function WebhookStatusChecker({ settings }: WebhookStatusCheckerProps) {
  const [statuses, setStatuses] = useState<WebhookStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [testingWebhooks, setTestingWebhooks] = useState<Set<string>>(new Set());

  const webhookConfigs = [
    { key: 'authenticated_webhook_url', name: 'Authenticated Webhook' },
    { key: 'anonymous_webhook_url', name: 'Anonymous Webhook' },
    { key: 'debug_webhook_url', name: 'Debug Webhook' },
    { key: 'thumbs_up_webhook_url', name: 'Thumbs Up Webhook' },
    { key: 'thumbs_down_webhook_url', name: 'Thumbs Down Webhook' },
    { key: 'user_signup_webhook_url', name: 'User Signup Webhook' }
  ];

  // Sample payloads for each webhook type
  const getSamplePayload = (webhookKey: string) => {
    const baseTime = new Date().toISOString();
    
    switch (webhookKey) {
      case 'authenticated_webhook_url':
        return {
          message: "🧪 Test message from authenticated user",
          user_id: "test-user-123",
          username: "test_user",
          sender: "Admin Test Panel",
          timestamp: baseTime,
          metadata: {
            test: true,
            source: "admin_panel"
          }
        };
      case 'anonymous_webhook_url':
        return {
          message: "🧪 Test message from anonymous user",
          sender: "Admin Test Panel",
          timestamp: baseTime,
          metadata: {
            test: true,
            source: "admin_panel",
            anonymous: true
          }
        };
      case 'debug_webhook_url':
        return {
          debug_info: {
            test_type: "webhook_debug_test",
            timestamp: baseTime,
            browser: navigator.userAgent,
            screen_resolution: `${screen.width}x${screen.height}`,
            test_data: {
              performance: {
                connection_speed: "high",
                latency: 45
              }
            }
          },
          metadata: {
            test: true,
            source: "admin_panel"
          }
        };
      case 'thumbs_up_webhook_url':
        return {
          feedback_type: 'thumbs_up',
          message_id: 'test-msg-' + Date.now(),
          user_id: 'test-user-123',
          timestamp: baseTime,
          message_content: 'Sample message that received positive feedback',
          metadata: {
            test: true,
            source: "admin_panel"
          }
        };
      case 'thumbs_down_webhook_url':
        return {
          feedback_type: 'thumbs_down',
          message_id: 'test-msg-' + Date.now(),
          user_id: 'test-user-123',
          timestamp: baseTime,
          message_content: 'Sample message that received negative feedback',
          feedback_reason: 'Test feedback from admin panel',
          metadata: {
            test: true,
            source: "admin_panel"
          }
        };
      case 'user_signup_webhook_url':
        return {
          user_id: 'test-user-' + Date.now(),
          email: 'test@example.com',
          username: 'test_user_' + Date.now(),
          first_name: 'John',
          last_name: 'Doe',
          phone_number: '5551234567',
          phone_country_code: '+1',
          signup_timestamp: baseTime,
          user_metadata: {
            source: 'admin_test',
            test_signup: true,
            first_name: 'John',
            last_name: 'Doe'
          },
          metadata: {
            test: true,
            source: "admin_panel"
          }
        };
      default:
        return {
          test_message: "🧪 Generic test payload",
          timestamp: baseTime,
          metadata: {
            test: true,
            source: "admin_panel"
          }
        };
    }
  };

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
            lastChecked: new Date(),
            webhookKey: config.key
          };
        }

        const status = await checkWebhookStatus(url);
        
        return {
          name: config.name,
          url,
          status,
          lastChecked: new Date(),
          webhookKey: config.key
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

  const testWebhook = async (webhook: WebhookStatus) => {
    if (webhook.status !== 'online' || !webhook.url) return;
    
    setTestingWebhooks(prev => new Set(prev).add(webhook.webhookKey));
    
    try {
      const payload = getSamplePayload(webhook.webhookKey);
      
      logger.info(`Testing webhook: ${webhook.name}`, { 
        url: webhook.url, 
        payload 
      }, { module: 'webhook-status-checker' });
      
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.text();
      
      if (response.ok) {
        supaToast.success(`${webhook.name} test successful! Response: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`, {
          title: "Webhook Test Passed"
        });
        
        logger.info(`Webhook test successful: ${webhook.name}`, { 
          status: response.status, 
          response: result 
        }, { module: 'webhook-status-checker' });
      } else {
        throw new Error(`HTTP ${response.status}: ${result}`);
      }
    } catch (error) {
      logger.error(`Webhook test failed: ${webhook.name}`, error, { module: 'webhook-status-checker' });
      
      supaToast.error(`${webhook.name} test failed: ${error.message}`, {
        title: "Webhook Test Failed"
      });
    } finally {
      setTestingWebhooks(prev => {
        const newSet = new Set(prev);
        newSet.delete(webhook.webhookKey);
        return newSet;
      });
    }
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
                {webhook.status === 'online' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testWebhook(webhook)}
                    disabled={testingWebhooks.has(webhook.webhookKey)}
                    className="h-6 px-2 text-xs"
                  >
                    {testingWebhooks.has(webhook.webhookKey) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <TestTube className="h-3 w-3" />
                    )}
                    <span className="ml-1 hidden sm:inline">Test</span>
                  </Button>
                )}
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
