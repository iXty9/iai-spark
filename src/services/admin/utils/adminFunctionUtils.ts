
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

// Helper function to invoke admin-users edge function
export async function invokeAdminFunction(action: string, params: any = {}): Promise<any> {
  try {
    logger.info('Invoking admin function', { action, module: 'admin-functions' });
    
    // Get the current session
    const sessionResponse = await supabase.auth.getSession();
    const session = sessionResponse?.data?.session;
    
    if (!session) {
      throw new Error('No active session');
    }

    // Check if functions property exists before calling invoke
    if (!supabase.functions || typeof supabase.functions.invoke !== 'function') {
      logger.error('Supabase functions API is not available', { module: 'admin-functions' });
      throw new Error('Supabase functions API is not available');
    }

    // Invoke the edge function with safe error handling
    try {
      const response = await supabase.functions.invoke('admin-users', {
        body: { action, params },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (!response) {
        throw new Error(`No response from admin-users function (${action})`);
      }
      
      // Use in operator to safely check for error property
      if (response && 'error' in response && response.error) {
        logger.error('Error from admin-users function', response.error, { 
          action, 
          module: 'admin-functions' 
        });
        throw response.error;
      }

      logger.info('Admin function completed successfully', { action, module: 'admin-functions' });
      
      // Safely return data if it exists
      return response && 'data' in response ? response.data : null;
      
    } catch (err) {
      logger.error('Error in supabase.functions.invoke', err, { 
        action, 
        module: 'admin-functions' 
      });
      throw err;
    }
    
  } catch (error) {
    logger.error('Error in admin function call', error, { 
      action, 
      module: 'admin-functions' 
    });
    throw error;
  }
}
