
import { logger } from '@/utils/logging';

/**
 * Manages request lifecycle including cancellation
 */
export interface RequestHandler {
  cancel?: () => void;
}

/**
 * Handles aborting an active request
 */
export const handleAbortRequest = (
  currentRequest: RequestHandler | null, 
  setIsLoading: (loading: boolean) => void,
  setSubmitting: (submitting: boolean) => void
) => {
  if (currentRequest && typeof currentRequest.cancel === 'function') {
    currentRequest.cancel();
    setIsLoading(false);
    setSubmitting(false);
    
    logger.info('Request aborted by user', null, { module: 'chat' });
    
    // Dispatch event for UI components to update
    window.dispatchEvent(new CustomEvent('aiResponseAborted', { 
      detail: { abortedAt: new Date().toISOString() } 
    }));
    
    return true;
  }
  
  return false;
};
