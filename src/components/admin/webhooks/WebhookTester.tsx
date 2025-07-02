
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TestTube, Loader2, CheckCircle, XCircle, RefreshCw, Wifi, MessageSquare, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { fetchAppSettings } from '@/services/admin/settingsService';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  type: 'proactive' | 'toast';
  status: 'success' | 'error';
  message: string;
  timestamp: Date;
  details?: any;
}

export function WebhookTester() {
  const { toast } = useToast();
  const { isConnected, realtimeStatus, forceReconnect } = useWebSocket();
  const [isTestingProactive, setIsTestingProactive] = useState(false);
  const [isTestingToast, setIsTestingToast] = useState(false);
  const [isLoadingUrls, setIsLoadingUrls] = useState(true);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [webhookUrls, setWebhookUrls] = useState({
    proactive: '',
    toast: ''
  });

  useEffect(() => {
    loadWebhookUrls();
  }, []);

  const loadWebhookUrls = async () => {
    setIsLoadingUrls(true);
    try {
      const settings = await fetchAppSettings();
      
      const baseUrl = window.location.origin.includes('localhost') 
        ? 'http://localhost:54321'
        : 'https://ymtdtzkskjdqlzhjuesk.supabase.co';
      
      const proactiveUrl = settings.proactive_message_webhook_url || `${baseUrl}/functions/v1/proactive-message-webhook`;
      const toastUrl = settings.toast_notification_webhook_url || `${baseUrl}/functions/v1/toast-notification-webhook`;
      
      setWebhookUrls({
        proactive: proactiveUrl,
        toast: toastUrl
      });
      
      console.log('Loaded webhook URLs:', { proactiveUrl, toastUrl });
    } catch (error) {
      console.error('Error loading webhook URLs:', error);
      // Fallback to default URLs
      const baseUrl = window.location.origin.includes('localhost') 
        ? 'http://localhost:54321'
        : 'https://ymtdtzkskjdqlzhjuesk.supabase.co';
      
      setWebhookUrls({
        proactive: `${baseUrl}/functions/v1/proactive-message-webhook`,
        toast: `${baseUrl}/functions/v1/toast-notification-webhook`
      });
    } finally {
      setIsLoadingUrls(false);
    }
  };

  const testProactiveWebhook = async () => {
    setIsTestingProactive(true);
    try {
      // Add connection status check
      if (!isConnected) {
        toast({
          variant: "destructive",
          title: "WebSocket Not Connected",
          description: "WebSocket connection is required to receive test messages. Check the connection status indicator.",
        });
      }

      console.log('Testing proactive webhook:', webhookUrls.proactive);
      console.log('WebSocket status:', { isConnected, realtimeStatus });
      
      const testMessage = `🧪 Test proactive message from admin panel - ${new Date().toLocaleString()}`;
      
      const response = await fetch(webhookUrls.proactive, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'apikey': supabase.supabaseKey
        },
        body: JSON.stringify({
          message: testMessage,
          sender: 'Admin Test Panel',
          metadata: {
            test: true,
            priority: 'normal'
          }
        })
      });

      const result = await response.json();
      console.log('Proactive webhook response:', result);
      
      if (response.ok) {
        setTestResults(prev => [...prev, {
          type: 'proactive',
          status: 'success',
          message: `✅ Proactive message webhook test successful. ${!isConnected ? '(Note: WebSocket not connected for real-time delivery)' : 'Check for the test message in your chat!'}`,
          timestamp: new Date(),
          details: result
        }]);
        
        toast({
          title: "Test Successful",
          description: `Proactive message webhook is working correctly. ${!isConnected ? 'WebSocket connection needed for real-time delivery.' : 'Check for the test message!'}`,
        });
      } else {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Proactive webhook test error:', error);
      
      setTestResults(prev => [...prev, {
        type: 'proactive',
        status: 'error',
        message: `❌ Proactive webhook test failed: ${error.message}`,
        timestamp: new Date(),
        details: error
      }]);
      
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: `Proactive message webhook test failed: ${error.message}`,
      });
    } finally {
      setIsTestingProactive(false);
    }
  };

  const testToastWebhook = async () => {
    setIsTestingToast(true);
    try {
      // Add connection status check
      if (!isConnected) {
        toast({
          variant: "destructive",
          title: "WebSocket Not Connected",
          description: "WebSocket connection is required to receive test notifications. Check the connection status indicator.",
        });
      }

      console.log('Testing toast webhook:', webhookUrls.toast);
      console.log('WebSocket status:', { isConnected, realtimeStatus });
      
      const response = await fetch(webhookUrls.toast, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'apikey': supabase.supabaseKey
        },
        body: JSON.stringify({
          title: '🧪 Test Notification',
          message: `This is a test toast notification from the admin panel - ${new Date().toLocaleString()}`,
          type: 'info'
        })
      });

      const result = await response.json();
      console.log('Toast webhook response:', result);
      
      if (response.ok) {
        setTestResults(prev => [...prev, {
          type: 'toast',
          status: 'success',
          message: `✅ Toast notification webhook test successful. ${!isConnected ? '(Note: WebSocket not connected for real-time delivery)' : 'You should see the notification!'}`,
          timestamp: new Date(),
          details: result
        }]);
        
        toast({
          title: "Test Successful",
          description: `Toast notification webhook is working correctly. ${!isConnected ? 'WebSocket connection needed for real-time delivery.' : 'You should see the test notification!'}`,
        });
      } else {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Toast webhook test error:', error);
      
      setTestResults(prev => [...prev, {
        type: 'toast',
        status: 'error',
        message: `❌ Toast webhook test failed: ${error.message}`,
        timestamp: new Date(),
        details: error
      }]);
      
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: `Toast notification webhook test failed: ${error.message}`,
      });
    } finally {
      setIsTestingToast(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (isLoadingUrls) {
    return (
      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Webhook Testing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading webhook URLs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Webhook Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* WebSocket Status Alert */}
        <Alert className={`border ${isConnected ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-600' : 'text-yellow-600'}`} />
          <AlertDescription className={isConnected ? 'text-green-800' : 'text-yellow-800'}>
            <div className="flex items-center justify-between">
              <span>
                WebSocket Status: <strong>{realtimeStatus}</strong>
                {!isConnected && ' (Real-time delivery unavailable)'}
              </span>
              {!isConnected && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={forceReconnect}
                  className="ml-2"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reconnect
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>

        <Alert>
          <AlertDescription>
            Test your webhook endpoints to ensure they're working correctly. 
            These tests will send real notifications to all connected users.
            {!isConnected && ' Note: WebSocket connection is required for real-time message delivery.'}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            <p><strong>Proactive URL:</strong> {webhookUrls.proactive}</p>
            <p><strong>Toast URL:</strong> {webhookUrls.toast}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadWebhookUrls}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh URLs
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={testProactiveWebhook}
            disabled={isTestingProactive}
            className="flex items-center gap-2"
          >
            {isTestingProactive ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            Test Proactive Message
          </Button>

          <Button
            onClick={testToastWebhook}
            disabled={isTestingToast}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isTestingToast ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            Test Toast Notification
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Test Results</h4>
              <Button variant="outline" size="sm" onClick={clearResults}>
                Clear Results
              </Button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                  <div className="flex items-center gap-3">
                    {result.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <Badge variant={result.type === 'proactive' ? 'default' : 'secondary'}>
                        {result.type}
                      </Badge>
                      <p className="text-sm mt-1">{result.message}</p>
                      {result.details && (
                        <details className="text-xs text-muted-foreground mt-1">
                          <summary>Details</summary>
                          <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(result.details, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
