
import { getSupabaseClient } from '@/services/supabase/simplified-connection-service';

// Export the client getter function
export const getClient = getSupabaseClient;

// For backward compatibility, also export as default
export { getSupabaseClient as supabase };
