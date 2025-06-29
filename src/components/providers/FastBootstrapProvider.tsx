
import React, { useEffect, useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Settings, Database, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { coordinatedInitService, InitializationStatus } from '@/services/initialization/coordinated-init-service';
import { logger } from '@/utils/logging';

interface FastBootstrapProviderProps {
  children: ReactNode;
}

export const FastBootstrapProvider: React.FC<FastBootstrapProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<InitializationStatus | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  // Smart redirect logic - only redirect once and not if already on special routes
  useEffect(() => {
    if (status?.error && status.phase === 'error' && !hasRedirected) {
      // Don't redirect if we're already on a special route
      const specialRoutes = ['/initialize', '/error'];
      const isOnSpecialRoute = specialRoutes.some(route => location.pathname.startsWith(route));
      
      if (!isOnSpecialRoute) {
        logger.info('Configuration error detected, redirecting to initialize', {
          module: 'bootstrap-provider',
          currentPath: location.pathname
        });
        setHasRedirected(true);
        navigate('/initialize');
      }
    }
  }, [status?.error, status?.phase, navigate, location.pathname, hasRedirected]);

  // Show app if ready
  if (status?.isComplete) {
    return <>{children}</>;
  }

  // If there's an error and we've redirected, don't render anything
  if (status?.error && status.phase === 'error' && hasRedirected) {
    return null;
  }

  // Show simple loading state (like the original)
  const getPhaseInfo = (phase: string) => {
    switch (phase) {
      case 'config':
        return { icon: Settings, text: 'Loading Configuration', color: 'text-[#dd3333]' };
      case 'client':
        return { icon: Database, text: 'Connecting to Database', color: 'text-[#dd3333]' };
      case 'theme':
        return { icon: CheckCircle, text: 'Initializing Themes', color: 'text-[#dd3333]' };
      case 'complete':
        return { icon: CheckCircle, text: 'Ready!', color: 'text-[#dd3333]' };
      default:
        return { icon: Loader2, text: 'Starting...', color: 'text-[#dd3333]' };
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
                Please wait...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
