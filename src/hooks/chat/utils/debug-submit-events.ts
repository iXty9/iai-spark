
import { emitDebugEvent } from '@/utils/debug-events';

/**
 * Emits debug events specific to message submission process
 */
export const emitDebugSubmitEvent = (action: string, error: string | null = null) => {
  emitDebugEvent({
    lastAction: action,
    lastError: error,
    isLoading: action.includes('starting') || action.includes('waiting'),
    inputState: action.includes('starting') ? 'Sending' : (action.includes('waiting') ? 'Waiting for response' : 'Ready')
  });
};
