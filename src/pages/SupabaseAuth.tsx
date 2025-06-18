
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle, Home, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logging';
import { connectionService } from '@/services/config/connection-service';
import { initializationService } from '@/services/config/initialization-service';

const SupabaseAuth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        // Check if client is ready
        const isClientReady = connectionService.isReady();
        const isSystemReady = initializationService.isReady();
        
        if (!isClientReady || !isSystemReady) {
          logger.warn('Auth callback attempted but system not ready', {
            module: 'auth-callback',
            clientReady: isClientReady,
            systemReady: isSystemReady
          });
          
          setNeedsBootstrap(true);
          setError('System not ready for authentication. Please wait for initialization to complete.');
          setIsProcessing(false);
          return;
        }

        // Check for error parameters
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          logger.error('Auth callback error', { error, errorDescription }, { module: 'auth-callback' });
          setError(errorDescription || error);
          setIsProcessing(false);
          return;
        }
        
        // Check for successful auth tokens
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          logger.info('Auth callback successful with tokens', { module: 'auth-callback' });
          
          // Get the client and process the auth
          const client = connectionService.getClient();
          if (!client) {
            throw new Error('Client not available after successful callback');
          }

          // The auth state change should be handled automatically by the AuthContext
          // We just need to wait for it to process
          setSuccess(true);
          
          // Redirect after success
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          // Handle auth state that might be in session storage
          const client = connectionService.getClient();
          if (client) {
            const { data: { session } } = await client.auth.getSession();
            if (session) {
              logger.info('Auth callback with existing session', { module: 'auth-callback' });
              setSuccess(true);
              setTimeout(() => {
                navigate('/');
              }, 2000);
            } else {
              setError('No authentication tokens or session found');
            }
          } else {
            setError('Authentication service not available');
          }
        }
      } catch (e) {
        logger.error('Error processing auth callback', e, { module: 'auth-callback' });
        setError(e instanceof Error ? e.message : 'Failed to process authentication');
      } finally {
        setIsProcessing(false);
      }
    };

    processAuthCallback();
  }, [searchParams, navigate]);

  // Handle bootstrap retry
  const handleBootstrapRetry = () => {
    navigate('/initialize?retry=true');
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please wait while we complete your authentication...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsBootstrap) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              System Not Ready
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Initialization Required</AlertTitle>
              <AlertDescription>
                {error || 'The system needs to complete initialization before processing authentication.'}
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col gap-2">
              <Button onClick={handleBootstrapRetry} className="w-full">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Initialize System
              </Button>
              
              <Button 
                onClick={() => navigate('/')} 
                variant="outline" 
                className="w-full"
              >
                <Home className="mr-2 h-4 w-4" />
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Authentication Successful
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Welcome!</AlertTitle>
              <AlertDescription>
                You have been successfully authenticated. Redirecting to the application...
              </AlertDescription>
            </Alert>
            
            <Button onClick={() => navigate('/')} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go to Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Authentication Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Authentication Failed</AlertTitle>
            <AlertDescription>
              {error || 'An unknown error occurred during authentication'}
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/')} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Button>
            
            <Button 
              onClick={() => navigate('/initialize')} 
              variant="outline" 
              className="w-full"
            >
              Setup Application
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupabaseAuth;
