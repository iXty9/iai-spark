
import React, { useEffect, useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw, Info, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logger } from '@/utils/logging';
import { clearConfigAndResetClient } from '@/config/supabase-config';
import { ConfigSource } from '@/services/supabase/config-loader-types';
import { eventBus, AppEvents } from '@/utils/event-bus';
import { 
  BootstrapState, 
  ErrorType, 
  BootstrapContext
} from '@/services/supabase/bootstrap/bootstrap-states';
import { bootstrapManager } from '@/services/supabase/bootstrap/bootstrap-manager';

interface BootstrapProviderProps {
  children: React.ReactNode;
}

// Routes that should never be redirected from, even if configuration is missing
const NON_REDIRECTABLE_ROUTES = [
  '/supabase-auth',
  '/initialize',
  '/admin/connection'
];

export function BootstrapProvider({ children }: BootstrapProviderProps) {
  // State machine context
  const [context, setContext] = useState<BootstrapContext>(() => bootstrapManager.getContext());
  
  // Additional UI state
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if current route should prevent redirects
  const isNonRedirectablePath = React.useCallback(() => {
    return NON_REDIRECTABLE_ROUTES.some(route => location.pathname.startsWith(route));
  }, [location.pathname]);
  
  // Handle URL parameters
  const handleUrlParameters = React.useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const forceInit = urlParams.get('force_init') === 'true';
    const resetConfig = urlParams.get('reset_config') === 'true';
    
    if (resetConfig) {
      logger.info('Reset configuration parameter detected', {
        module: 'bootstrap-provider'
      });
      clearConfigAndResetClient();
      
      // Reload the page with force_init parameter
      navigate('/initialize?force_init=true', { replace: true });
      return true;
    }
    
    if (forceInit) {
      logger.info('Force initialization parameter detected, redirecting to setup', {
        module: 'bootstrap-provider'
      });
      clearConfigAndResetClient();
      navigate('/initialize?force_init=true');
      return true;
    }
    
    return false;
  }, [navigate]);
  
  // Handle retry action
  const handleRetry = React.useCallback(() => {
    bootstrapManager.startBootstrap();
  }, []);
  
  // Handle reconnect/setup action
  const handleReconnect = React.useCallback(() => {
    // Always navigate to initialize without forcing init
    // This allows the setup page to detect and use existing config if valid
    navigate('/initialize');
  }, [navigate]);
  
  // Handle manual configuration action
  const handleManualConfig = React.useCallback(() => {
    // When manually configuring, force initialization
    navigate('/initialize?force_init=true');
  }, [navigate]);
  
  // Subscribe to bootstrap events
  useEffect(() => {
    // Handle URL parameters first
    if (handleUrlParameters()) {
      return;
    }
    
    // Subscribe to bootstrap events
    const subscriptions = [
      eventBus.subscribe(AppEvents.BOOTSTRAP_COMPLETED, (ctx: BootstrapContext) => {
        setContext(ctx);
        setShowSuccessMessage(true);
        
        // Hide success message after a delay
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 3000);
      }),
      
      eventBus.subscribe(AppEvents.BOOTSTRAP_FAILED, (ctx: BootstrapContext) => {
        setContext(ctx);
      }),
      
      eventBus.subscribe(AppEvents.BOOTSTRAP_STARTED + ':' + BootstrapState.LOADING, (ctx: BootstrapContext) => {
        setContext(ctx);
      }),
      
      eventBus.subscribe(AppEvents.BOOTSTRAP_STARTED + ':' + BootstrapState.CONFIG_FOUND, (ctx: BootstrapContext) => {
        setContext(ctx);
      }),
      
      eventBus.subscribe(AppEvents.BOOTSTRAP_STARTED + ':' + BootstrapState.CONFIG_MISSING, (ctx: BootstrapContext) => {
        setContext(ctx);
      }),
      
      eventBus.subscribe(AppEvents.BOOTSTRAP_STARTED + ':' + BootstrapState.CONNECTION_ERROR, (ctx: BootstrapContext) => {
        setContext(ctx);
      }),
      
      eventBus.subscribe(AppEvents.BOOTSTRAP_STARTED + ':' + BootstrapState.CONNECTION_SUCCESS, (ctx: BootstrapContext) => {
        setContext(ctx);
      }),
      
      eventBus.subscribe(AppEvents.BOOTSTRAP_STARTED + ':' + BootstrapState.COMPLETE, (ctx: BootstrapContext) => {
        setContext(ctx);
      })
    ];
    
    // Start bootstrap process
    bootstrapManager.startBootstrap();
    
    // Clean up subscriptions
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [handleUrlParameters]);
  
  // Redirect to initialize page for empty or invalid config
  useEffect(() => {
    // Don't redirect if we're on a non-redirectable path
    if (isNonRedirectablePath()) {
      logger.info('Preventing redirect from protected path', {
        module: 'bootstrap-provider',
        currentPath: location.pathname
      });
      return;
    }
    
    // Automatically redirect to initialization page if needed
    if ((context.state === BootstrapState.CONFIG_MISSING || 
         context.state === BootstrapState.CONNECTION_ERROR) && 
        !window.location.pathname.includes('/initialize')) {
      logger.info('Auto-redirecting to initialize page due to missing config or connection error', {
        module: 'bootstrap-provider',
        currentPath: window.location.pathname,
        state: context.state,
        errorType: context.errorType
      });
      navigate('/initialize');
    }
  }, [context.state, context.errorType, navigate, isNonRedirectablePath, location.pathname]);
  
  // If on a non-redirectable path, bypass loading and error states
  if (isNonRedirectablePath()) {
    return <>{children}</>;
  }
  
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
                {context.errorType === ErrorType.CONFIG && context.error?.toLowerCase().includes('url format') && (
                  <>
                    The Supabase URL in your configuration is invalid. Please check the format and ensure it starts with https://.
                  </>
                )}
                {context.errorType === ErrorType.CONFIG && !context.error?.toLowerCase().includes('url format') && (
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
