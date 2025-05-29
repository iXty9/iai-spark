
import { emitDebugEvent } from '@/utils/debug-events';

/**
 * Optimized debug events for message submission process
 * Zero-cost in production builds
 */
export const emitDebugSubmitEvent = (action: string, error: string | null = null) => {
  // Early return in production for performance
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  
  emitDebugEvent({
    lastAction: action,
    lastError: error,
    isLoading: action.includes('starting') || action.includes('waiting'),
    inputState: action.includes('starting') ? 'Sending' : 
               (action.includes('waiting') ? 'Waiting for response' : 'Ready')
  });
};
