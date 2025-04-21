
import { useRef } from 'react';
import { emitDebugEvent } from '@/utils/debug-events';

export const useSubmitState = () => {
  const isSubmitting = useRef<boolean>(false);

  const setSubmitting = (submitting: boolean) => {
    isSubmitting.current = submitting;
    
    emitDebugEvent({
      lastAction: submitting ? 'Message submission starting' : 'Message submission completed',
      isLoading: submitting,
      inputState: submitting ? 'Sending' : 'Ready'
    });
  };

  return {
    isSubmitting: isSubmitting.current,
    setSubmitting
  };
};
