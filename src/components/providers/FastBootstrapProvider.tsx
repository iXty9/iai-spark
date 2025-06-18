
import React, { useEffect, useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Settings, Database, RefreshCcw, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { initializationService } from '@/services/config/initialization-service';
import { logger } from '@/utils/logging';

interface FastBootstrapProviderProps {
  children: ReactNode;
}

export const FastBootstrapProvider: React.FC<FastBootstrapProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        const result = await initializationService.initialize();
        
        if (result.isComplete) {
          setIsReady(true);
          setError(null);
        } else {
          setError(result.error || 'Configuration required');
          if (result.needsConfiguration) {
            navigate('/initialize');
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        logger.error('Bootstrap initialization failed', err);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [navigate]);

  // Show app if ready
  if (isReady) {
    return <>{children}</>;
  }

  // Show setup needed
  if (error && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {error}
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

  // Show loading state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Initializing Application</p>
              <p className="text-sm text-muted-foreground">Please wait...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
