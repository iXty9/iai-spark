
import React, { useEffect, useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Settings, Database, RefreshCcw, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { coordinatedInitService, InitializationStatus } from '@/services/initialization/coordinated-init-service';
import { logger } from '@/utils/logging';

interface FastBootstrapProviderProps {
  children: ReactNode;
}

export const FastBootstrapProvider: React.FC<FastBootstrapProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<InitializationStatus | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Subscribe to initialization status
    const unsubscribe = coordinatedInitService.subscribe((initStatus) => {
      setStatus(initStatus);
      logger.info('Initialization status updated', { 
        module: 'bootstrap-provider',
        phase: initStatus.phase,
        isComplete: initStatus.isComplete
      });
    });

    // Start initialization immediately
    coordinatedInitService.initialize().catch(error => {
      logger.error('Failed to initialize coordinated init service', error);
    });

    return unsubscribe;
  }, []);

  // Auto-redirect to setup when needed
  useEffect(() => {
    if (status?.error && status.phase === 'error') {
      navigate('/initialize');
    }
  }, [status?.error, status?.phase, navigate]);

  // Show app if ready
  if (status?.isComplete) {
    return <>{children}</>;
  }

  // Show setup needed
  if (status?.error && status.phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please configure your database connection to continue.
            </p>
            <Button onClick={() => navigate('/initialize')} className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Start Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show detailed loading state with phase information
  const getPhaseInfo = (phase: string) => {
    switch (phase) {
      case 'config':
        return { icon: Settings, text: 'Loading Configuration', color: 'text-blue-500' };
      case 'client':
        return { icon: Database, text: 'Connecting to Database', color: 'text-green-500' };
      case 'theme':
        return { icon: CheckCircle, text: 'Initializing Themes', color: 'text-purple-500' };
      case 'complete':
        return { icon: CheckCircle, text: 'Ready!', color: 'text-green-600' };
      default:
        return { icon: Loader2, text: 'Starting...', color: 'text-blue-500' };
    }
  };

  const phaseInfo = getPhaseInfo(status?.phase || 'starting');
  const PhaseIcon = phaseInfo.icon;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <PhaseIcon className={`h-8 w-8 ${phaseInfo.color} ${status?.phase === 'starting' ? 'animate-spin' : ''}`} />
            <div className="text-center">
              <p className="font-medium">{phaseInfo.text}</p>
              <p className="text-sm text-muted-foreground">
                {status?.phase === 'complete' ? 'Loading interface...' : 'Please wait...'}
              </p>
            </div>
            {/* Progress indicator */}
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Config</span>
                <span>Client</span>
                <span>Theme</span>
                <span>Ready</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${
                      status?.phase === 'config' ? '25%' :
                      status?.phase === 'client' ? '50%' :
                      status?.phase === 'theme' ? '75%' :
                      status?.phase === 'complete' ? '100%' : '0%'
                    }` 
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
