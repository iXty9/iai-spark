
import { getSupabaseClient } from '@/services/supabase/simplified-connection-service';

// Create a proxy object that always returns the current client
const supabaseProxy = new Proxy({} as any, {
  get(target, prop) {
    // Get the current client instance
    const client = getSupabaseClient();
    
    if (!client) {
      // Return a function that throws an error for method calls
      if (typeof prop === 'string') {
        return () => {
          throw new Error(`Supabase client not available. Property: ${prop}`);
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
export const getClient = getSupabaseClient;
