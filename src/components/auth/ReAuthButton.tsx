
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import { clientManager, ClientStatus } from '@/services/supabase/client-manager';
import { logger } from '@/utils/logging';

interface ReAuthButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export const ReAuthButton: React.FC<ReAuthButtonProps> = ({ 
  onSuccess, 
  onError, 
  className 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReAuth = async () => {
    setIsProcessing(true);
    setStatus('idle');
    setErrorMessage(null);

    try {
      // Check if client is available
      const client = clientManager.getClient();
      if (!client) {
        throw new Error('Authentication service not available. Please initialize the application first.');
      }

      // Try to refresh the session
      const { data, error } = await client.auth.refreshSession();
      
      if (error) {
        throw error;
      }

      if (data.session) {
        logger.info('Re-authentication successful', { module: 're-auth' });
        setStatus('success');
        onSuccess?.();
      } else {
        throw new Error('No session returned from refresh');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Re-authentication failed';
      logger.error('Re-authentication failed', error, { module: 're-auth' });
      setStatus('error');
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const getButtonContent = () => {
    if (isProcessing) {
      return (
        <>
          <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
          Re-authenticating...
        </>
      );
    }

    if (status === 'success') {
      return (
        <>
          <CheckCircle className="mr-2 h-4 w-4" />
          Authentication Refreshed
        </>
      );
    }

    return (
      <>
        <RefreshCcw className="mr-2 h-4 w-4" />
        Re-authenticate
      </>
    );
  };

  const getButtonVariant = () => {
    if (status === 'success') return 'default';
    if (status === 'error') return 'destructive';
    return 'outline';
  };

  return (
    <div className="space-y-2">
      <Button 
        onClick={handleReAuth}
        disabled={isProcessing}
        variant={getButtonVariant()}
        className={className}
      >
        {getButtonContent()}
      </Button>

      {status === 'error' && errorMessage && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
