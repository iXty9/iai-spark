
import React, { useEffect, useState, useCallback } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw, Settings, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logger } from '@/utils/logging';
import { simpleBootstrap, BootstrapResult } from '@/services/supabase/simple-bootstrap';

interface SimpleBootstrapProviderProps {
  children: React.ReactNode;
}

enum BootstrapStatus {
  CHECKING = 'checking',
  SUCCESS = 'success',
  FAILED = 'failed',
  NEEDS_SETUP = 'needs_setup'
}

// Routes that should never be redirected from
const PROTECTED_ROUTES = [
  '/supabase-auth',
  '/initialize', 
  '/admin/connection'
];

export function SimpleBootstrapProvider({ children }: SimpleBootstrapProviderProps) {
  const [status, setStatus] = useState<BootstrapStatus>(BootstrapStatus.CHECKING);
  const [result, setResult] = useState<BootstrapResult | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if current route should prevent redirects
  const isProtectedRoute = useCallback(() => {
    return PROTECTED_ROUTES.some(route => location.pathname.startsWith(route));
  }, [location.pathname]);
  
  // Main bootstrap function
  const runBootstrap = useCallback(async () => {
    if (isProtectedRoute()) {
      logger.info('Skipping bootstrap on protected route', {
        module: 'simple-bootstrap-provider',
        path: location.pathname
      });
      setStatus(BootstrapStatus.SUCCESS);
      return;
    }

    setStatus(BootstrapStatus.CHECKING);
    
    try {
      const bootstrapResult = await simpleBootstrap.bootstrap();
      setResult(bootstrapResult);
      
      if (bootstrapResult.success) {
        setStatus(BootstrapStatus.SUCCESS);
        setShowSuccessMessage(true);
        
        // Hide success message after 3 seconds
        setTimeout(() => setShowSuccessMessage(false), 3000);
        
        logger.info('Bootstrap completed successfully', {
          module: 'simple-bootstrap-provider',
          source: bootstrapResult.source
        });
      } else {
        if (bootstrapResult.error?.includes('No valid configuration found') ||
            bootstrapResult.error?.includes('Force init requested') ||
            bootstrapResult.error?.includes('Config reset requested')) {
          setStatus(BootstrapStatus.NEEDS_SETUP);
        } else {
          setStatus(BootstrapStatus.FAILED);
        }
        
        logger.warn('Bootstrap failed', {
          module: 'simple-bootstrap-provider',
          error: bootstrapResult.error,
          source: bootstrapResult.source
        });
      }
    } catch (error) {
      setStatus(BootstrapStatus.FAILED);
      setResult({ success: false, error: String(error) });
      logger.error('Bootstrap error', error, { module: 'simple-bootstrap-provider' });
    }
  }, [isProtectedRoute, location.pathname]);

  // Run bootstrap on mount and when location changes
  useEffect(() => {
    runBootstrap();
  }, [runBootstrap]);

  // Auto-redirect to setup when needed
  useEffect(() => {
    if (status === BootstrapStatus.NEEDS_SETUP && !isProtectedRoute()) {
      navigate('/initialize');
    }
  }, [status, navigate, isProtectedRoute]);

  // Handle retry
  const handleRetry = useCallback(() => {
    runBootstrap();
  }, [runBootstrap]);

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
  switch (status) {
    case BootstrapStatus.CHECKING:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p>Checking configuration...</p>
          </div>
        </div>
      );

    case BootstrapStatus.FAILED:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>
                {result?.error || 'Failed to connect to the database'}
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col space-y-2">
              <Button onClick={handleRetry} variant="outline" className="w-full">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Retry Connection
              </Button>
              
              <Button onClick={handleReset} className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Reset & Configure
              </Button>
            </div>
          </div>
        </div>
      );

    case BootstrapStatus.NEEDS_SETUP:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md w-full space-y-4">
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertTitle>Setup Required</AlertTitle>
              <AlertDescription>
                This application needs to be configured before you can use it.
                Please complete the setup process to continue.
              </AlertDescription>
            </Alert>
            
            <Button onClick={handleSetup} className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Setup Application
            </Button>
          </div>
        </div>
      );

    case BootstrapStatus.SUCCESS:
    default:
      return (
        <>
          {showSuccessMessage && (
            <div className="fixed bottom-4 right-4 max-w-sm z-50">
              <Alert className="bg-green-50 border-green-200 text-green-800 shadow-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Connected</AlertTitle>
                <AlertDescription>
                  Successfully connected using {result?.source || 'configuration'}
                </AlertDescription>
              </Alert>
            </div>
          )}
          {children}
        </>
      );
  }
}
