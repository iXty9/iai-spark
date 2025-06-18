
import { clientManager } from '@/services/supabase/client-manager';
import { logger } from '@/utils/logging';

// Create a more resilient proxy that handles unavailable client gracefully
const supabaseProxy = new Proxy({} as any, {
  get(target, prop) {
    // Get the current client instance
    const client = clientManager.getClient();
    
    if (!client) {
      // For auth methods, return functions that can queue operations
      if (prop === 'auth') {
        return new Proxy({}, {
          get(authTarget, authProp) {
            if (typeof authProp === 'string') {
              return (...args: any[]) => {
                // Wait for client to be ready and retry
                return clientManager.waitForReadiness().then(isReady => {
                  if (!isReady) {
                    throw new Error(`Authentication service not available. Property: ${String(authProp)}`);
                  }
                  const readyClient = clientManager.getClient();
                  if (!readyClient) {
                    throw new Error(`Client still not available after readiness check`);
                  }
                  const authMethod = (readyClient.auth as any)[authProp];
                  if (typeof authMethod === 'function') {
                    return authMethod.apply(readyClient.auth, args);
                  }
                  return authMethod;
                });
              };
            }
            return undefined;
          }
        });
      }
      
      // For other methods, return functions that wait for client
      if (typeof prop === 'string') {
        return (...args: any[]) => {
          logger.warn(`Supabase client not available, waiting for initialization. Property: ${prop}`, { module: 'supabase-client' });
          
          return clientManager.waitForReadiness().then(isReady => {
            if (!isReady) {
              throw new Error(`Supabase client not available. Property: ${prop}. Please ensure the application is properly initialized.`);
            }
            const readyClient = clientManager.getClient();
            if (!readyClient) {
              throw new Error(`Client still not available after readiness check`);
            }
            const method = (readyClient as any)[prop];
            if (typeof method === 'function') {
              return method.apply(readyClient, args);
            }
            return method;
          });
        };
      }
      return undefined;
    }
    
    // Return the property from the actual client
    const value = (client as any)[prop];
    
    // If it's a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(client);
    }
    
    return value;
  }
});

// Export the proxy as the default client
export const supabase = supabaseProxy;

// Export the client getter function for direct access
export const getClient = () => clientManager.getClient();
