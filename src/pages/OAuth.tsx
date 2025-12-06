import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function OAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'awaiting-auth'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [locationName, setLocationName] = useState<string | null>(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    // Prevent double processing
    if (hasProcessed.current) return;

    const handleOAuthCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const state = searchParams.get('state');

      // Check for OAuth error from GHL
      if (error) {
        hasProcessed.current = true;
        setStatus('error');
        setErrorMessage(errorDescription || error);
        return;
      }

      // Check for authorization code
      if (!code) {
        // Check if we're returning after auth with a stored code
        const storedCode = sessionStorage.getItem('ghl_pending_code');
        if (!storedCode) {
          hasProcessed.current = true;
          setStatus('error');
          setErrorMessage('No authorization code received. Please try connecting again.');
          return;
        }
        // We have a stored code, continue with that
        if (!user) {
          // Still not logged in after returning, show error
          hasProcessed.current = true;
          setStatus('error');
          setErrorMessage('You must be logged in to connect HighLevel.');
          return;
        }
        // Process stored code
        await processOAuthCode(storedCode);
        return;
      }

      // Verify state (CSRF protection) - only if state was provided
      const savedState = sessionStorage.getItem('ghl_oauth_state');
      if (state && savedState && state !== savedState) {
        hasProcessed.current = true;
        setStatus('error');
        setErrorMessage('Invalid state parameter. Please try connecting again.');
        return;
      }
      sessionStorage.removeItem('ghl_oauth_state');

      // If user is not logged in, store code and redirect to auth
      if (!user) {
        // Store the OAuth code for after authentication
        sessionStorage.setItem('ghl_pending_code', code);
        if (state) {
          sessionStorage.setItem('ghl_pending_state', state);
        }
        setStatus('awaiting-auth');
        // Redirect to auth with returnTo parameter
        navigate('/auth?returnTo=/oauth');
        return;
      }

      // User is logged in, process the code
      await processOAuthCode(code);
    };

    const processOAuthCode = async (code: string) => {
      hasProcessed.current = true;
      
      try {
        // Exchange code for tokens via edge function
        const { data, error: invokeError } = await supabase.functions.invoke('ghl-oauth-callback', {
          body: { code, userId: user!.id },
        });

        // Clear stored code after processing
        sessionStorage.removeItem('ghl_pending_code');
        sessionStorage.removeItem('ghl_pending_state');

        if (invokeError) {
          throw new Error(invokeError.message || 'Failed to complete OAuth flow');
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        setLocationName(data?.installation?.location_name || null);
        setStatus('success');
      } catch (err) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    };

    handleOAuthCallback();
  }, [searchParams, user, authLoading, navigate]);

  const handleContinue = () => {
    navigate('/settings?tab=integrations');
  };

  const handleRetry = () => {
    navigate('/settings?tab=integrations');
  };

  return (
    <div className="container max-w-md py-20">
      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {status === 'loading' && 'Connecting HighLevel...'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we complete the setup'}
            {status === 'success' && 'Your HighLevel account is now connected'}
            {status === 'error' && 'There was a problem connecting your account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            {status === 'loading' && (
              <div className="p-4 rounded-full bg-primary/10">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
            )}
            {status === 'error' && (
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20">
                <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            )}
          </div>

          {status === 'success' && locationName && (
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground">Connected Location</div>
              <div className="font-medium">{locationName}</div>
            </div>
          )}

          {status === 'error' && errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            {status === 'success' && (
              <Button onClick={handleContinue} className="w-full">
                Continue to Settings
              </Button>
            )}
            {status === 'error' && (
              <>
                <Button onClick={handleRetry} className="w-full">
                  Try Again
                </Button>
                <Button variant="ghost" onClick={() => navigate('/')} className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}