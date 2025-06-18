
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle, Database, RefreshCcw, Settings } from 'lucide-react';
import { logger } from '@/utils/logging';
import { connectionService } from '@/services/config/connection-service';
import { initializationService } from '@/services/config/initialization-service';
import { configManager } from '@/services/config/ConfigurationManager';

const Reconnect = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkApplicationState();
  }, []);

  const checkApplicationState = async () => {
    try {
      logger.info('Checking application state for reconnection', { module: 'reconnect' });
      
      // Try to load config first
      const configResult = await configManager.loadConfiguration();
      
      if (configResult.success && configResult.config) {
        // Config exists and is valid, redirect to main app
        logger.info('Valid config found, redirecting to app', { module: 'reconnect' });
        navigate('/');
        return;
      }

      // Check if we can detect existing database setup
      const hasLocalConfig = localStorage.getItem('app-config') || 
                            localStorage.getItem('supabase_config');
      
      setHasExistingData(!!hasLocalConfig);
      setIsLoading(false);
      
    } catch (error) {
      logger.error('Error checking application state', error, { module: 'reconnect' });
      setError(error instanceof Error ? error.message : 'Failed to check application state');
      setIsLoading(false);
    }
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    setError(null);
    
    try {
      logger.info('Attempting to reconnect with existing configuration', { module: 'reconnect' });
      
      // Try to reinitialize with existing local config
      const result = await initializationService.initialize();
      
      if (result.isComplete) {
        logger.info('Reconnection successful', { module: 'reconnect' });
        navigate('/');
      } else {
        logger.info('Reconnection failed, needs fresh setup', { module: 'reconnect' });
        navigate('/initialize');
      }
    } catch (error) {
      logger.error('Reconnection failed', error, { module: 'reconnect' });
      setError(error instanceof Error ? error.message : 'Reconnection failed');
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleFreshSetup = () => {
    navigate('/initialize?force_init=true');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <div className="text-center">
                <p className="font-medium">Checking Application State</p>
                <p className="text-sm text-muted-foreground">Please wait...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Reconnect Application</h1>
          <p className="text-muted-foreground">
            Your application appears to be disconnected from its database configuration
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Configuration Status
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {hasExistingData ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Previous Configuration Detected</AlertTitle>
                <AlertDescription>
                  We found signs of a previous setup. You can try to reconnect using the existing configuration.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Previous Configuration Found</AlertTitle>
                <AlertDescription>
                  No previous configuration was detected. You may need to set up the application from scratch.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-3">
              {hasExistingData && (
                <Button 
                  onClick={handleReconnect} 
                  disabled={isReconnecting}
                  className="w-full"
                >
                  {isReconnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reconnecting...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Try to Reconnect
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                onClick={handleFreshSetup}
                variant={hasExistingData ? "outline" : "default"}
                className="w-full"
              >
                <Settings className="mr-2 h-4 w-4" />
                Set Up From Scratch
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              If you're experiencing connection issues, try setting up from scratch.
              This will guide you through the complete configuration process.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reconnect;
