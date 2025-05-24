
import React, { useEffect, useState, useCallback } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCcw, Settings, CheckCircle, Database, Shield } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logger } from '@/utils/logging';
import { bootstrapOrchestrator } from '@/services/bootstrap/bootstrap-orchestrator';
import { bootstrapPhases, BootstrapPhase, BootstrapState } from '@/services/bootstrap/bootstrap-phases';
import { clientManager, ClientStatus } from '@/services/supabase/client-manager';
import { ReAuthButton } from '@/components/auth/ReAuthButton';

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
  const [state, setState] = useState<BootstrapState>(bootstrapPhases.getState());
  const [clientState, setClientState] = useState(clientManager.getState());
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showReAuth, setShowReAuth] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if current route should prevent redirects
  const isProtectedRoute = useCallback(() => {
    return PROTECTED_ROUTES.some(route => location.pathname.startsWith(route));
  }, [location.pathname]);
  
  // Subscribe to bootstrap state changes
  useEffect(() => {
    const unsubscribe = bootstrapPhases.subscribe((newState) => {
      setState(newState);
      
      // Show success message when bootstrap completes
      if (newState.phase === BootstrapPhase.COMPLETE && state.phase !== BootstrapPhase.COMPLETE) {
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      }
    });
    
    return unsubscribe;
  }, [state.phase]);

  // Subscribe to client state changes
  useEffect(() => {
    const unsubscribe = clientManager.subscribe((newClientState) => {
      setClientState(newClientState);
      
      // Show re-auth option if client is ready but auth might have issues
      if (newClientState.status === ClientStatus.READY && 
          state.phase === BootstrapPhase.COMPLETE) {
        setShowReAuth(true);
      } else {
        setShowReAuth(false);
      }
    });
    
    return unsubscribe;
  }, [state.phase]);
  
  // Run bootstrap on mount - only if not on protected route
  useEffect(() => {
    if (isProtectedRoute()) {
      logger.info('Skipping bootstrap on protected route', {
        module: 'simple-bootstrap-provider',
        path: location.pathname
      });
      return;
    }

    // Only bootstrap if we haven't started or need to retry
    if (state.phase === BootstrapPhase.NOT_STARTED || state.phase === BootstrapPhase.ERROR) {
      bootstrapOrchestrator.bootstrap();
    }
  }, [location.pathname, isProtectedRoute, state.phase]);

  // Auto-redirect to setup when needed
  useEffect(() => {
    if (state.phase === BootstrapPhase.NEEDS_SETUP && !isProtectedRoute()) {
      navigate('/initialize');
    }
  }, [state.phase, navigate, isProtectedRoute]);

  // Handle retry
  const handleRetry = useCallback(() => {
    bootstrapOrchestrator.bootstrap();
  }, []);

  // Handle setup
  const handleSetup = useCallback(() => {
    navigate('/initialize');
  }, [navigate]);

  // Handle reset and setup
  const handleReset = useCallback(() => {
    bootstrapOrchestrator.reset();
    navigate('/initialize?force_init=true');
  }, [navigate]);

  // Handle successful re-authentication
  const handleReAuthSuccess = useCallback(() => {
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  }, []);

  // Skip loading/error states for protected routes
  if (isProtectedRoute()) {
    return <>{children}</>;
  }

  // Get phase display info
  const getPhaseInfo = () => {
    switch (state.phase) {
      case BootstrapPhase.LOADING_CONFIG:
        return { icon: Database, label: 'Loading configuration...' };
      case BootstrapPhase.CONFIG_LOADED:
        return { icon: CheckCircle, label: 'Configuration loaded' };
      case BootstrapPhase.INITIALIZING_CLIENT:
        return { icon: Database, label: 'Initializing database client...' };
      case BootstrapPhase.CLIENT_READY:
        return { icon: CheckCircle, label: 'Database client ready' };
      case BootstrapPhase.INITIALIZING_AUTH:
        return { icon: Shield, label: 'Initializing authentication...' };
      case BootstrapPhase.AUTH_READY:
        return { icon: CheckCircle, label: 'Authentication ready' };
      case BootstrapPhase.COMPLETE:
        return { icon: CheckCircle, label: 'Application ready' };
      default:
        return { icon: Loader2, label: 'Starting...' };
    }
  };

  // Render based on phase
  if (state.phase === BootstrapPhase.NOT_STARTED || 
      state.phase === BootstrapPhase.LOADING_CONFIG ||
      state.phase === BootstrapPhase.CONFIG_LOADED ||
      state.phase === BootstrapPhase.INITIALIZING_CLIENT ||
      state.phase === BootstrapPhase.CLIENT_READY ||
      state.phase === BootstrapPhase.INITIALIZING_AUTH ||
      state.phase === BootstrapPhase.AUTH_READY) {
    
    const phaseInfo = getPhaseInfo();
    const IconComponent = phaseInfo.icon;
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md">
          <IconComponent className={`h-8 w-8 mx-auto text-primary ${
            phaseInfo.icon === Loader2 ? 'animate-spin' : ''
          }`} />
          <p className="text-lg font-medium">{phaseInfo.label}</p>
          <Progress value={state.progress} className="w-full" />
          <p className="text-sm text-muted-foreground">
            Progress: {state.progress}%
          </p>
          {state.configSource && (
            <p className="text-xs text-muted-foreground">
              Config source: {state.configSource}
            </p>
          )}
          {clientState.status !== ClientStatus.NOT_INITIALIZED && (
            <p className="text-xs text-muted-foreground">
              Client: {clientState.status}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === BootstrapPhase.ERROR) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Bootstrap Error</AlertTitle>
            <AlertDescription>
              {state.error || 'Failed to initialize the application'}
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Progress reached: {state.progress}%
            </p>
            {state.configSource && (
              <p className="text-sm text-muted-foreground">
                Config source: {state.configSource}
              </p>
            )}
            {clientState.error && (
              <p className="text-sm text-muted-foreground">
                Client error: {clientState.error}
              </p>
            )}
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button onClick={handleRetry} variant="outline" className="w-full">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            
            <Button onClick={handleReset} className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Reconfigure
            </Button>

            {showReAuth && (
              <ReAuthButton 
                onSuccess={handleReAuthSuccess}
                className="w-full"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === BootstrapPhase.NEEDS_SETUP) {
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
  }

  // Bootstrap complete - show app
  return (
    <>
      {showSuccessMessage && (
        <div className="fixed bottom-4 right-4 max-w-sm z-50">
          <Alert className="bg-green-50 border-green-200 text-green-800 shadow-lg">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Ready</AlertTitle>
            <AlertDescription>
              Application initialized successfully
            </AlertDescription>
          </Alert>
        </div>
      )}
      {children}
    </>
  );
}
