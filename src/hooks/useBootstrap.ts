
import { useState, useEffect } from 'react';
import { bootstrapManager } from '../services/supabase/bootstrap/bootstrap-manager';
import { BootstrapContext } from '../services/supabase/bootstrap/bootstrap-states';
import { eventBus, AppEvents } from '../utils/event-bus';

export function useBootstrap() {
  const initialContext = bootstrapManager.getContext();
  const [context, setContext] = useState<BootstrapContext>(initialContext);

  useEffect(() => {
    const subscriptions = [
      eventBus.subscribe(AppEvents.BOOTSTRAP_COMPLETED, (ctx: BootstrapContext) => {
        setContext(ctx);
      }),
      eventBus.subscribe(AppEvents.BOOTSTRAP_FAILED, (ctx: BootstrapContext) => {
        setContext(ctx);
      })
    ];

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, []);

  return {
    state: context.state,
    error: context.error,
    errorType: context.errorType,
    configSource: context.configSource,
    retryCount: context.retryCount,
    lastAttempt: context.lastAttempt,
    lastSuccess: context.lastSuccess,
  };
}
