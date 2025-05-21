
import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw, Info, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logger } from '@/utils/logging';
import { clearConfigAndResetClient } from '@/config/supabase-config';
import { ConfigSource } from '@/services/supabase/config-loader-types';
import { eventBus, AppEvents } from '@/utils/event-bus';
import { useBootstrap, BootstrapState } from '@/hooks/useBootstrap';

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
  const { 
    state: bootstrapState,
    error: bootstrapError,
    handleRetry 
  } = useBootstrap();
  
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
  
  // Handle URL parameters on initial load
  useEffect(() => {
    handleUrlParameters();
  }, [handleUrlParameters]);
  
  // Display success message when bootstrap complete
  useEffect(() => {
    if (bootstrapState === BootstrapState.CONNECTION_SUCCESS || 
        bootstrapState === BootstrapState.COMPLETE) {
      setShowSuccessMessage(true);
      
      // Hide success message after a delay
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [bootstrapState]);
  
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
    if ((bootstrapState === BootstrapState.CONFIG_MISSING || 
         bootstrapState === BootstrapState.CONNECTION_ERROR) && 
        !window.location.pathname.includes('/initialize')) {
      logger.info('Auto-redirecting to initialize page due to missing config or connection error', {
        module: 'bootstrap-provider',
        currentPath: window.location.pathname,
        state: bootstrapState
      });
      navigate('/initialize');
    }
  }, [bootstrapState, navigate, isNonRedirectablePath, location.pathname]);
  
  // If on a non-redirectable path, bypass loading and error states
  if (isNonRedirectablePath()) {
    return <>{children}</>;
  }
  
  // Render based on current state
  if (bootstrapState === BootstrapState.COMPLETE || 
      bootstrapState === BootstrapState.CONNECTION_SUCCESS) {
    // Show success message and render children
    return (
      <>
        {showSuccessMessage && (
          <div className="fixed bottom-4 right-4 max-w-sm z-50">
            <Alert className="bg-green-50 border-green-200 text-green-800 shadow-lg">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Connected</AlertTitle>
              <AlertDescription>
                Connection established successfully
              </AlertDescription>
            </Alert>
          </div>
        )}
        {children}
      </>
    );
  }
  
  // For all other states, show appropriate UI based on state
  return (
    <div className="flex items-center justify-center min-h-screen">
      {bootstrapState === BootstrapState.LOADING || bootstrapState === BootstrapState.INITIAL ? (
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p>Checking configuration...</p>
        </div>
      ) : bootstrapState === BootstrapState.CONNECTION_ERROR ? (
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              {bootstrapError || "Failed to connect to the backend services."}
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={handleRetry} 
              variant="outline"
              className="w-full"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry Connection
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
      ) : bootstrapState === BootstrapState.CONFIG_MISSING ? (
        <div className="max-w-md w-full space-y-4">
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Setup Required</AlertTitle>
            <AlertDescription>
              Application configuration is missing or invalid.
              Please complete the setup process to continue.
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
      ) : (
        // Fallback for any other state
        <div className="text-center space-y-4">
          <p>Loading application...</p>
        </div>
      )}
    </div>
  );
}
