
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

// Helper function to invoke admin-users edge function
export async function invokeAdminFunction(action: string, params: any = {}): Promise<any> {
  try {
    // Get the current session
    const sessionResponse = await supabase.auth.getSession();
    const session = sessionResponse?.data?.session;
    
    if (!session) {
      throw new Error('No active session');
    }

    // Check if functions property exists before calling invoke
    if (!supabase.functions || typeof supabase.functions.invoke !== 'function') {
      logger.error(`Supabase functions API is not available`, { module: 'roles' });
      throw new Error('Supabase functions API is not available');
    }

    // Invoke the edge function with error handling
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
      
      if (response.error) {
        logger.error(`Error invoking admin-users function (${action}):`, response.error, { module: 'roles' });
        throw response.error;
      }

      return response.data;
    } catch (err) {
      logger.error(`Error in supabase.functions.invoke:`, err, { module: 'roles' });
      throw err;
    }
  } catch (error) {
    logger.error(`Error in admin function call (${action}):`, error, { module: 'roles' });
    throw error;
  }
}
