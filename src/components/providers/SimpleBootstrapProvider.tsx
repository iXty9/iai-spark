
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, AlertTriangle, CheckCircle, Settings, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { bootstrapOrchestrator } from '@/services/bootstrap/bootstrap-orchestrator';
import { bootstrapPhases, BootstrapPhase } from '@/services/bootstrap/bootstrap-phases';
import { selfHealingBootstrap } from '@/services/bootstrap/self-healing-bootstrap';
import { logger } from '@/utils/logging';

interface SimpleBootstrapProviderProps {
  children: React.ReactNode;
}

export const SimpleBootstrapProvider: React.FC<SimpleBootstrapProviderProps> = ({ children }) => {
  const [bootstrapState, setBootstrapState] = useState(bootstrapPhases.getState());
  const [isHealing, setIsHealing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Subscribe to bootstrap state changes
    const unsubscribe = bootstrapPhases.subscribe(setBootstrapState);

    // Start bootstrap process
    bootstrapOrchestrator.bootstrap();

    return unsubscribe;
  }, []);

  // Handle automatic healing attempts
  const handleAutoHeal = async () => {
    setIsHealing(true);
    try {
      const success = await selfHealingBootstrap.performHealing();
      if (success) {
        // Restart bootstrap process
        await bootstrapOrchestrator.bootstrap();
      }
    } catch (error) {
      logger.error('Auto-heal failed', error);
    } finally {
      setIsHealing(false);
    }
  };

  // Handle manual setup
  const handleManualSetup = () => {
    navigate('/initialize?force_init=true');
  };

  // Calculate progress percentage
  const getProgress = () => {
    const phaseOrder = [
      BootstrapPhase.NOT_STARTED,
      BootstrapPhase.LOADING_CONFIG,
      BootstrapPhase.CONFIG_LOADED,
      BootstrapPhase.INITIALIZING_CLIENT,
      BootstrapPhase.CLIENT_READY,
      BootstrapPhase.INITIALIZING_AUTH,
      BootstrapPhase.AUTH_READY,
      BootstrapPhase.COMPLETE
    ];
    
    const currentIndex = phaseOrder.indexOf(bootstrapState.phase);
    return currentIndex >= 0 ? (currentIndex / (phaseOrder.length - 1)) * 100 : 0;
  };

  // Show children if bootstrap is complete
  if (bootstrapState.phase === BootstrapPhase.COMPLETE) {
    return <>{children}</>;
  }

  // Show loading state for other phases
  if (bootstrapState.phase !== BootstrapPhase.NEEDS_SETUP && 
      bootstrapState.phase !== BootstrapPhase.ERROR) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Initializing Application
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(getProgress())}%</span>
              </div>
              <Progress value={getProgress()} className="w-full" />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <div>Status: {bootstrapState.phase.replace(/_/g, ' ')}</div>
              {bootstrapState.configSource && (
                <div>Config Source: {bootstrapState.configSource}</div>
              )}
            </div>

            {bootstrapState.phase === BootstrapPhase.LOADING_CONFIG && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Loading configuration from available sources...
                </AlertDescription>
              </Alert>
            )}

            {bootstrapState.phase === BootstrapPhase.INITIALIZING_CLIENT && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Connecting to Supabase services...
                </AlertDescription>
              </Alert>
            )}

            {bootstrapState.phase === BootstrapPhase.INITIALIZING_AUTH && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Setting up authentication system...
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state with recovery options
  if (bootstrapState.phase === BootstrapPhase.ERROR) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              System Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Bootstrap Failed</AlertTitle>
              <AlertDescription>
                {bootstrapState.error || 'An unknown error occurred during system initialization.'}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button 
                onClick={handleAutoHeal} 
                disabled={isHealing}
                className="w-full"
              >
                {isHealing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Attempting Recovery...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Auto-Heal System
                  </>
                )}
              </Button>

              <Button 
                onClick={handleManualSetup} 
                variant="outline"
                className="w-full"
              >
                <Settings className="mr-2 h-4 w-4" />
                Manual Setup
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Try auto-heal first, or use manual setup if the problem persists.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show setup needed state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-100">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <Settings className="h-5 w-5" />
            Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Initial Setup Needed</AlertTitle>
            <AlertDescription>
              The application needs to be configured before it can be used.
            </AlertDescription>
          </Alert>

          <Button onClick={handleManualSetup} className="w-full">
            <Settings className="mr-2 h-4 w-4" />
            Start Setup Process
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
