
import React, { useEffect, useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, AlertTriangle, CheckCircle, Settings, RefreshCcw, Activity, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BootstrapPhase } from '@/services/bootstrap/bootstrap-phases';
import { unifiedBootstrap, UnifiedBootstrapStatus } from '@/services/bootstrap/unified-bootstrap-service';
import { logger } from '@/utils/logging';

interface UnifiedBootstrapProviderProps {
  children: ReactNode;
}

export const UnifiedBootstrapProvider: React.FC<UnifiedBootstrapProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<UnifiedBootstrapStatus | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize unified bootstrap
    unifiedBootstrap.initialize().catch(error => {
      logger.error('Failed to initialize unified bootstrap', error);
    });

    // Subscribe to status updates
    const unsubscribe = unifiedBootstrap.subscribe(setStatus);

    return unsubscribe;
  }, []);

  // Handle automatic recovery
  const handleRecovery = async () => {
    setIsRecovering(true);
    try {
      const success = await unifiedBootstrap.performRecovery();
      
      if (success) {
        // Wait a moment for state to update
        setTimeout(() => {
          setIsRecovering(false);
        }, 2000);
      } else {
        setIsRecovering(false);
      }
    } catch (error) {
      logger.error('Recovery failed', error);
      setIsRecovering(false);
    }
  };

  // Handle manual setup
  const handleManualSetup = () => {
    navigate('/initialize?force_init=true');
  };

  // Handle reset
  const handleReset = async () => {
    await unifiedBootstrap.reset();
    navigate('/initialize?force_init=true');
  };

  // Get phase icon and label
  const getPhaseInfo = () => {
    if (!status) return { icon: Loader2, label: 'Starting...', color: 'text-blue-500' };
    
    switch (status.phase) {
      case BootstrapPhase.LOADING_CONFIG:
        return { icon: Loader2, label: 'Loading configuration...', color: 'text-blue-500' };
      case BootstrapPhase.CONFIG_LOADED:
        return { icon: CheckCircle, label: 'Configuration loaded', color: 'text-green-500' };
      case BootstrapPhase.INITIALIZING_CLIENT:
        return { icon: Loader2, label: 'Connecting to services...', color: 'text-blue-500' };
      case BootstrapPhase.CLIENT_READY:
        return { icon: CheckCircle, label: 'Services connected', color: 'text-green-500' };
      case BootstrapPhase.INITIALIZING_AUTH:
        return { icon: Shield, label: 'Setting up authentication...', color: 'text-blue-500' };
      case BootstrapPhase.AUTH_READY:
        return { icon: CheckCircle, label: 'Authentication ready', color: 'text-green-500' };
      case BootstrapPhase.COMPLETE:
        return { icon: CheckCircle, label: 'Application ready', color: 'text-green-500' };
      default:
        return { icon: Loader2, label: 'Initializing...', color: 'text-blue-500' };
    }
  };

  // Show children if bootstrap is complete and ready
  if (status?.isReady && status.phase === BootstrapPhase.COMPLETE) {
    return <>{children}</>;
  }

  // Show loading state for active phases
  if (status && 
      status.phase !== BootstrapPhase.NEEDS_SETUP && 
      status.phase !== BootstrapPhase.ERROR) {
    
    const phaseInfo = getPhaseInfo();
    const IconComponent = phaseInfo.icon;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconComponent className={`h-5 w-5 ${
                phaseInfo.icon === Loader2 ? 'animate-spin' : ''
              } ${phaseInfo.color}`} />
              Application Bootstrap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{status?.progress || 0}%</span>
              </div>
              <Progress value={status?.progress || 0} className="w-full" />
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <div className={phaseInfo.color}>{phaseInfo.label}</div>
              {status?.configSource && (
                <div>Config: {status.configSource}</div>
              )}
              <div className="flex items-center gap-1 text-xs">
                <Activity className="h-3 w-3" />
                Services: {Object.values(status?.services || {}).filter(Boolean).length}/5
              </div>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {phaseInfo.label}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state with enhanced recovery options
  if (status?.phase === BootstrapPhase.ERROR || (status?.errors && status.errors.length > 0)) {
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
                {status?.errors?.[0] || 'An unknown error occurred during system initialization.'}
              </AlertDescription>
            </Alert>

            {status?.errors && status.errors.length > 1 && (
              <div className="text-xs bg-red-50 p-2 rounded max-h-32 overflow-y-auto">
                <div className="font-semibold mb-1">Additional Issues:</div>
                {status.errors.slice(1).map((error, index) => (
                  <div key={index} className="text-red-600">• {error}</div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={handleRecovery} 
                disabled={isRecovering}
                className="w-full"
              >
                {isRecovering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Auto-Recovering...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Auto-Recover System
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

              <Button 
                onClick={handleReset} 
                variant="destructive"
                className="w-full"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Reset & Reconfigure
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Auto-recovery attempts to fix common issues automatically.
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
