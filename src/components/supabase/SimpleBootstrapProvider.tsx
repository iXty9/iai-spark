
import React, { useEffect, useState, useCallback } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw, Settings, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logger } from '@/utils/logging';
import { simpleBootstrap } from '@/services/supabase/simple-bootstrap';
import { configState, ConfigStatus, ConfigState } from '@/services/config/config-state-manager';

interface SimpleBootstrapProviderProps {
  children: React.ReactNode;
}

// Routes that should never be redirected from
const PROTECTED_ROUTES = [
  '/supabase-auth',
  '/initialize', 
  '/admin/connection'
];

export function SimpleBootstrapProvider({ children }: SimpleBootstrapProviderProps) {
  const [state, setState] = useState<ConfigState>(configState.getState());
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if current route should prevent redirects
  const isProtectedRoute = useCallback(() => {
    return PROTECTED_ROUTES.some(route => location.pathname.startsWith(route));
  }, [location.pathname]);
  
  // Subscribe to config state changes
  useEffect(() => {
    const unsubscribe = configState.subscribe((newState) => {
      setState(newState);
      
      // Show success message when config becomes ready
      if (newState.status === ConfigStatus.READY && state.status !== ConfigStatus.READY) {
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      }
    });
    
    return unsubscribe;
  }, [state.status]);
  
  // Run bootstrap on mount - simplified logic
  useEffect(() => {
    if (isProtectedRoute()) {
      logger.info('Skipping bootstrap on protected route', {
        module: 'simple-bootstrap-provider',
        path: location.pathname
      });
      return;
    }

    // Only bootstrap if we're in loading state
    if (state.status === ConfigStatus.LOADING) {
      simpleBootstrap.bootstrap();
    }
  }, [location.pathname, isProtectedRoute, state.status]);

  // Auto-redirect to setup when needed
  useEffect(() => {
    if (state.status === ConfigStatus.NEEDS_SETUP && !isProtectedRoute()) {
      navigate('/initialize');
    }
  }, [state.status, navigate, isProtectedRoute]);

  // Handle retry
  const handleRetry = useCallback(() => {
    simpleBootstrap.bootstrap();
  }, []);

  // Handle manual setup
  const handleSetup = useCallback(() => {
    navigate('/initialize');
  }, [navigate]);

  // Handle reset and setup
  const handleReset = useCallback(() => {
    simpleBootstrap.reset();
    navigate('/initialize?force_init=true');
  }, [navigate]);

  // Skip loading/error states for protected routes
  if (isProtectedRoute()) {
    return <>{children}</>;
  }

  // Render based on status
  switch (state.status) {
    case ConfigStatus.LOADING:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p>Loading configuration...</p>
          </div>
        </div>
      );

    case ConfigStatus.ERROR:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>
                {state.error || 'Failed to connect to the database'}
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col space-y-2">
              <Button onClick={handleRetry} variant="outline" className="w-full">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              
              <Button onClick={handleReset} className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Reconfigure
              </Button>
            </div>
          </div>
        </div>
      );

    case ConfigStatus.NEEDS_SETUP:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md w-full space-y-4">
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertTitle>Setup Required</AlertTitle>
              <AlertDescription>
                Please configure your database connection to continue.
              </AlertDescription>
            </Alert>
            
            <Button onClick={handleSetup} className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Setup Application
            </Button>
          </div>
        </div>
      );

    case ConfigStatus.READY:
    default:
      return (
        <>
          {showSuccessMessage && (
            <div className="fixed bottom-4 right-4 max-w-sm z-50">
              <Alert className="bg-green-50 border-green-200 text-green-800 shadow-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Connected</AlertTitle>
                <AlertDescription>
                  Ready to use
                </AlertDescription>
              </Alert>
            </div>
          )}
          {children}
        </>
      );
  }
}
