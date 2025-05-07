
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Info, Database, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SupabaseConnectionForm } from '@/components/supabase/SupabaseConnectionForm';
import { getConnectionInfo, resetSupabaseClient, testSupabaseConnection } from '@/services/supabase/connection-service';
import { saveConfig } from '@/config/supabase-config';
import { fetchConnectionConfig } from '@/services/admin/settingsService';
import { ShareConfigDialog } from '@/components/supabase/ShareConfigDialog';

export default function SupabaseAuth() {
  const navigate = useNavigate();
  const connectionInfo = getConnectionInfo();
  const [isLoadingDbConfig, setIsLoadingDbConfig] = useState(true);
  const [dbConfigFound, setDbConfigFound] = useState(false);
  const [dbConfig, setDbConfig] = useState<any>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  
  // Check if there's a saved configuration in the database
  useEffect(() => {
    const checkDbConfig = async () => {
      try {
        const config = await fetchConnectionConfig();
        if (config) {
          setDbConfig(config);
          setDbConfigFound(true);
        }
      } catch (error) {
        console.error("Error checking for database config:", error);
      } finally {
        setIsLoadingDbConfig(false);
      }
    };
    
    checkDbConfig();
  }, []);
  
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
  
  const handleUseDbConfig = async () => {
    if (!dbConfig) return;
    
    setTestingConnection(true);
    
    try {
      // Test the connection before using it
      const connectionValid = await testSupabaseConnection(dbConfig.url, dbConfig.anonKey);
      
      if (connectionValid) {
        // Save the config from the database to localStorage
        saveConfig({
          url: dbConfig.url,
          anonKey: dbConfig.anonKey,
          serviceKey: dbConfig.serviceKey,
          isInitialized: dbConfig.isInitialized,
        });
        
        // Reset the Supabase client to use the new config
        resetSupabaseClient();
        
        // Navigate back to previous page or home
        navigate('/');
      } else {
        throw new Error("Connection failed with saved credentials");
      }
    } catch (error) {
      console.error("Error using saved configuration:", error);
    } finally {
      setTestingConnection(false);
    }
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
          {isLoadingDbConfig ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Checking for saved configuration...</span>
            </div>
          ) : dbConfigFound ? (
            <div className="space-y-6">
              <Alert>
                <Info className="h-4 w-4 text-green-500" />
                <AlertTitle>Saved Configuration Found</AlertTitle>
                <AlertDescription className="text-sm">
                  <p>A database configuration was found for URL: <span className="font-mono">{dbConfig.url.split('//')[1]}</span></p>
                  <p>Last connection: {dbConfig.lastConnection ? new Date(dbConfig.lastConnection).toLocaleString() : 'Unknown'}</p>
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleUseDbConfig} 
                  className="flex-1"
                  disabled={testingConnection}
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Use Saved Configuration'
                  )}
                </Button>
                
                {dbConfig && (
                  <ShareConfigDialog url={dbConfig.url} anonKey={dbConfig.anonKey} />
                )}
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or enter new connection details
                  </span>
                </div>
              </div>
              
              <SupabaseConnectionForm onSuccess={handleConnectionSuccess} />
            </div>
          ) : (
            <>
              {connectionInfo && (
                <Alert className="mb-6">
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
            </>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center border-t pt-4 mt-4">
          <p className="text-xs text-center text-muted-foreground">
            After connecting, you can share the connection URL with your team to allow access from other devices.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
