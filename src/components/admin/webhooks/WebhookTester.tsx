
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TestTube, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  type: 'proactive' | 'toast';
  status: 'success' | 'error';
  message: string;
  timestamp: Date;
}

export function WebhookTester() {
  const { toast } = useToast();
  const [isTestingProactive, setIsTestingProactive] = useState(false);
  const [isTestingToast, setIsTestingToast] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const testProactiveWebhook = async () => {
    setIsTestingProactive(true);
    try {
      const baseUrl = window.location.origin.includes('localhost') 
        ? 'http://localhost:54321'
        : 'https://ymtdtzkskjdqlzhjuesk.supabase.co';
      
      const response = await fetch(`${baseUrl}/functions/v1/proactive-message-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test proactive message from admin panel',
          sender: 'Admin Test',
          user_id: undefined, // Broadcast to all
          username: undefined
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestResults(prev => [...prev, {
          type: 'proactive',
          status: 'success',
          message: 'Proactive message webhook test successful',
          timestamp: new Date()
        }]);
        
        toast({
          title: "Test Successful",
          description: "Proactive message webhook is working correctly.",
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      setTestResults(prev => [...prev, {
        type: 'proactive',
        status: 'error',
        message: `Proactive webhook test failed: ${error.message}`,
        timestamp: new Date()
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
      const baseUrl = window.location.origin.includes('localhost') 
        ? 'http://localhost:54321'
        : 'https://ymtdtzkskjdqlzhjuesk.supabase.co';
      
      const response = await fetch(`${baseUrl}/functions/v1/toast-notification-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'This is a test toast notification from the admin panel',
          type: 'info'
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestResults(prev => [...prev, {
          type: 'toast',
          status: 'success',
          message: 'Toast notification webhook test successful',
          timestamp: new Date()
        }]);
        
        toast({
          title: "Test Successful",
          description: "Toast notification webhook is working correctly.",
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      setTestResults(prev => [...prev, {
        type: 'toast',
        status: 'error',
        message: `Toast webhook test failed: ${error.message}`,
        timestamp: new Date()
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

  return (
    <Card className="bg-background/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Webhook Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Test your webhook endpoints to ensure they're working correctly. 
            These tests will send real notifications to all connected users.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={testProactiveWebhook}
            disabled={isTestingProactive}
            className="flex items-center gap-2"
          >
            {isTestingProactive && <Loader2 className="h-4 w-4 animate-spin" />}
            Test Proactive Message
          </Button>

          <Button
            onClick={testToastWebhook}
            disabled={isTestingToast}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isTestingToast && <Loader2 className="h-4 w-4 animate-spin" />}
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
