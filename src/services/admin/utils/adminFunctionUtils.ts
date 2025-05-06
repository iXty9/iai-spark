
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

// Helper function to invoke admin-users edge function
export async function invokeAdminFunction(action: string, params: any = {}): Promise<any> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      throw new Error('No active session');
    }

    // Check if functions property exists before calling invoke
    if (!supabase.functions || typeof supabase.functions.invoke !== 'function') {
      logger.error(`Supabase functions API is not available`, { module: 'roles' });
      throw new Error('Supabase functions API is not available');
    }

    const response = await supabase.functions.invoke('admin-users', {
      body: { action, params },
      headers: {
        Authorization: `Bearer ${session.session.access_token}`
      }
    });

    const { data, error } = response || { data: null, error: null };

    if (error) {
      logger.error(`Error invoking admin-users function (${action}):`, error, { module: 'roles' });
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`Error in admin function call (${action}):`, error, { module: 'roles' });
    throw error;
  }
}
