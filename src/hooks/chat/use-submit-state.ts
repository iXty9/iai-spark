
import { useState } from 'react';
import { emitDebugEvent } from '@/utils/debug-events';

export const useSubmitState = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setSubmitting = (submitting: boolean) => {
    setIsSubmitting(submitting);
    
    emitDebugEvent({
      lastAction: submitting ? 'Message submission starting' : 'Message submission completed',
      isLoading: submitting,
      inputState: submitting ? 'Sending' : 'Ready'
    });
  };

  return {
    isSubmitting,
    setSubmitting
  };
};
