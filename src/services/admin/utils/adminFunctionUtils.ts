
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

// Helper function to invoke admin-users edge function
export async function invokeAdminFunction(action: string, params: any = {}): Promise<any> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error('No active session');
    }

    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action, params },
      headers: {
        Authorization: `Bearer ${session.session.access_token}`
      }
    });

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
