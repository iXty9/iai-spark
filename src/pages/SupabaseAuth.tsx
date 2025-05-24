
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logging';
import { testSupabaseConnection } from '@/services/supabase/simplified-connection-service';

const SupabaseAuth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        // Check for error parameters
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          logger.error('Auth callback error', { error, errorDescription }, { module: 'auth-callback' });
          setError(errorDescription || error);
          setIsProcessing(false);
          return;
        }
        
        // Check for successful auth
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        
        if (accessToken) {
          logger.info('Auth callback successful', { module: 'auth-callback' });
          setSuccess(true);
          
          // Test connection
          try {
            const result = await testSupabaseConnection('test', 'test');
            if (result.isConnected) {
              logger.info('Connection test passed after auth', { module: 'auth-callback' });
            }
          } catch (e) {
            logger.warn('Connection test failed after auth', e, { module: 'auth-callback' });
          }
          
          // Redirect after success
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          setError('No authentication tokens received');
        }
      } catch (e) {
        logger.error('Error processing auth callback', e, { module: 'auth-callback' });
        setError('Failed to process authentication');
      } finally {
        setIsProcessing(false);
      }
    };

    processAuthCallback();
  }, [searchParams, navigate]);

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
