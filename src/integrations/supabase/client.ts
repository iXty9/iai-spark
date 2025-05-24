
import { clientManager } from '@/services/supabase/client-manager';

// Create a more reliable proxy that always returns the current client
const supabaseProxy = new Proxy({} as any, {
  get(target, prop) {
    // Get the current client instance
    const client = clientManager.getClient();
    
    if (!client) {
      // Return a function that throws an error for method calls
      if (typeof prop === 'string') {
        return (...args: any[]) => {
          throw new Error(`Supabase client not available. Property: ${prop}. Please ensure the application is properly initialized.`);
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
