
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Info, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SupabaseConnectionForm } from '@/components/supabase/SupabaseConnectionForm';
import { getConnectionInfo, resetSupabaseClient } from '@/services/supabase/connection-service';
import { saveConfig } from '@/config/supabase-config';

export default function SupabaseAuth() {
  const navigate = useNavigate();
  const connectionInfo = getConnectionInfo();
  
  const handleGoBack = () => {
    navigate('/');
  };
  
  const handleConnectionSuccess = (url: string, anonKey: string) => {
    // Save the new configuration
    saveConfig({
      url,
      anonKey,
      isInitialized: true
    });
    
    // Reset the Supabase client to use the new config
    resetSupabaseClient();
    
    // Navigate back to previous page or home
    navigate('/');
  };

  return (
    <div className="container max-w-lg py-10">
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-6 flex items-center gap-1"
        onClick={handleGoBack}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Button>
      
      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center mb-2 gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Reconnect to Supabase</CardTitle>
          </div>
          <CardDescription>
            Re-establish connection to your Supabase project
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {connectionInfo && (
            <Alert className="mb-6" variant="warning">
              <Info className="h-4 w-4" />
              <AlertTitle>Current Environment</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                <p>Environment ID: <span className="font-mono">{connectionInfo.environmentId}</span></p>
                <p>Current URL: <span className="font-mono">{connectionInfo.url || 'Not set'}</span></p>
                <p>Last connected: {connectionInfo.lastConnection !== 'never' 
                  ? new Date(connectionInfo.lastConnection).toLocaleString() 
                  : 'Never'}
                </p>
              </AlertDescription>
            </Alert>
          )}
          
          <SupabaseConnectionForm onSuccess={handleConnectionSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}
