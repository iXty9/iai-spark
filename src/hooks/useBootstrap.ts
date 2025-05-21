
import { useState, useEffect } from 'react';
import { executeBootstrap, initBootstrapContext, BootstrapState } from '../services/supabase/bootstrap-state-machine';

/**
 * Hook to manage the bootstrap process for Supabase connection
 */
export const useBootstrap = () => {
  const [state, setState] = useState<string>('INITIAL');
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const startBootstrap = async () => {
      try {
        const initialContext = initBootstrapContext();
        setRetryCount(initialContext.retryCount);
        
        const result = await executeBootstrap(initialContext, (ctx) => {
          setState(ctx.state);
          setError(ctx.error || null);
          setErrorType(ctx.errorType || null);
          setRetryCount(ctx.retryCount);
        });
        
        setState(result.state);
        setError(result.error || null);
        setErrorType(result.errorType || null);
      } catch (e) {
        console.error('Bootstrap error:', e);
        setState('ERROR');
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    };
    
    startBootstrap();
  }, []);

  return {
    state,
    error,
    errorType,
    isLoading,
    retryCount,
  };
};
