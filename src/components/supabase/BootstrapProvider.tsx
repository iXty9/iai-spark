
import React, { useEffect, useState, useCallback } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw, Info, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logging';
import { clearConfigAndResetClient } from '@/config/supabase-config';
import { ConfigSource } from '@/services/supabase/config-loader-types';
import { 
  BootstrapState, 
  ErrorType, 
  BootstrapContext,
  initBootstrapContext,
  executeBootstrap,
  resetBootstrap,
  clearBootstrapContext
} from '@/services/supabase/bootstrap-state-machine';

interface BootstrapProviderProps {
  children: React.ReactNode;
}

export function BootstrapProvider({ children }: BootstrapProviderProps) {
  // State machine context
  const [context, setContext] = useState<BootstrapContext>(initBootstrapContext);
  
  // Additional UI state
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  
  const navigate = useNavigate();
  
  // Handle URL parameters
  const handleUrlParameters = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const forceInit = urlParams.get('force_init') === 'true';
    const resetConfig = urlParams.get('reset_config') === 'true';
    
    if (resetConfig) {
      logger.info('Reset configuration parameter detected', {
        module: 'bootstrap-provider'
      });
      clearConfigAndResetClient();
      clearBootstrapContext();
      
      // Reload the page with force_init parameter
      navigate('/initialize?force_init=true', { replace: true });
      return true;
    }
    
    if (forceInit) {
      logger.info('Force initialization parameter detected, redirecting to setup', {
        module: 'bootstrap-provider'
      });
      clearConfigAndResetClient();
      clearBootstrapContext();
      navigate('/initialize?force_init=true');
      return true;
    }
    
    return false;
  }, [navigate]);
  
  // Start bootstrap process
  const startBootstrap = useCallback(async () => {
    // Check URL parameters first
    if (handleUrlParameters()) {
      return;
    }
    
    // Execute bootstrap process
    await executeBootstrap(context, setContext);
  }, [context, handleUrlParameters]);
  
  // Handle retry action
  const handleRetry = useCallback(() => {
    // Reset state but keep retry count
    const newContext: BootstrapContext = {
      ...context,
      state: BootstrapState.INITIAL,
      error: undefined,
      errorType: undefined
    };
    
    setContext(newContext);
  }, [context]);
  
  // Handle reconnect/setup action
  const handleReconnect = useCallback(() => {
    // Always navigate to initialize without forcing init
    // This allows the setup page to detect and use existing config if valid
    navigate('/initialize');
  }, [navigate]);
  
  // Handle manual configuration action
  const handleManualConfig = useCallback(() => {
    // When manually configuring, force initialization
    navigate('/initialize?force_init=true');
  }, [navigate]);
  
  // Redirect to initialize page for empty or invalid config
  useEffect(() => {
    // Automatically redirect to initialization page if we're in CONFIG_MISSING state
    // and we're not already on the initialize page
    if (context.state === BootstrapState.CONFIG_MISSING && 
        !window.location.pathname.includes('/initialize')) {
      logger.info('Auto-redirecting to initialize page due to missing config', {
        module: 'bootstrap-provider',
        currentPath: window.location.pathname
      });
      navigate('/initialize');
    }
  }, [context.state, navigate]);
  
  // Effect for state transitions
  useEffect(() => {
    switch (context.state) {
      case BootstrapState.INITIAL:
        // Start bootstrap process
        startBootstrap();
        break;
        
      case BootstrapState.CONNECTION_SUCCESS:
        // Show success message briefly
        setShowSuccessMessage(true);
        break;
        
      case BootstrapState.COMPLETE:
        // Hide success message after a delay
        const timer = setTimeout(() => {
          setShowSuccessMessage(false);
        }, 2000);
        return () => clearTimeout(timer);
    }
  }, [context.state, startBootstrap]);
  
  // Render based on current state
  switch (context.state) {
    case BootstrapState.LOADING:
    case BootstrapState.INITIAL:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p>
              {context.retryCount > 0 
                ? `Retrying connection (attempt ${context.retryCount})...` 
                : "Checking connection configuration..."}
            </p>
          </div>
        </div>
      );
      
    case BootstrapState.CONNECTION_ERROR:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>
                {context.errorType === ErrorType.NETWORK && (
                  <>
                    Network connection issue detected. Please check your internet connection.
                  </>
                )}
                {context.errorType === ErrorType.AUTH && (
                  <>
                    Authentication failed. Your credentials may be invalid or expired.
                  </>
                )}
                {context.errorType === ErrorType.DATABASE && (
                  <>
                    Database structure issue detected. The database may need initialization.
                  </>
                )}
                {context.errorType === ErrorType.CONFIG && (
                  <>
                    Configuration issue detected. The application may need to be set up.
                  </>
                )}
                {context.errorType === ErrorType.UNKNOWN && context.error}
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={handleRetry} 
                variant="outline"
                disabled={context.retryCount >= 3}
                className="w-full"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {context.retryCount >= 3 ? 'Max retries reached' : 'Retry Connection'}
              </Button>
              
              <Button 
                onClick={handleManualConfig} 
                className="w-full"
              >
                <Settings className="mr-2 h-4 w-4" />
                Manual Configuration
              </Button>
            </div>
          </div>
        </div>
      );
      
    case BootstrapState.CONFIG_MISSING:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md w-full space-y-4">
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Setup Required</AlertTitle>
              <AlertDescription>
                {context.configSource ? (
                  <>
                    Configuration file was found but contains invalid or empty values.
                    Please complete the setup process to continue.
                  </>
                ) : (
                  <>
                    This appears to be your first visit or the application hasn't been configured yet.
                    You'll need to set up your database connection to continue.
                  </>
                )}
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleReconnect} 
              className="w-full"
            >
              <Settings className="mr-2 h-4 w-4" />
              Setup Application
            </Button>
          </div>
        </div>
      );
      
    case BootstrapState.CONNECTION_SUCCESS:
    case BootstrapState.COMPLETE:
      // Show success message and render children
      return (
        <>
          {showSuccessMessage && (
            <div className="fixed bottom-4 right-4 max-w-sm z-50">
              <Alert className="bg-green-50 border-green-200 text-green-800 shadow-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Auto-connected</AlertTitle>
                <AlertDescription>
                  Successfully connected using {
                    context.configSource === ConfigSource.STATIC_FILE 
                      ? 'site configuration file' 
                      : context.configSource === ConfigSource.URL_PARAMETERS
                        ? 'URL parameters'
                        : context.configSource === ConfigSource.LOCAL_STORAGE
                          ? 'saved configuration'
                          : context.configSource === ConfigSource.ENVIRONMENT
                            ? 'environment variables'
                            : context.configSource === ConfigSource.DATABASE
                              ? 'database settings'
                              : 'configuration'
                  }
                </AlertDescription>
              </Alert>
            </div>
          )}
          {children}
        </>
      );
      
    default:
      return <>{children}</>;
  }
}
