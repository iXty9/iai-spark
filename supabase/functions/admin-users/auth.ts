
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
  code?: string;
}

export async function authenticateAndAuthorize(authHeader: string | null): Promise<AuthResult> {
  if (!authHeader) {
    return {
      success: false,
      error: 'Missing authorization header',
      code: "auth_error"
    };
  }

  // Create Supabase client with service role
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return {
      success: false,
      error: 'Server configuration error',
      code: "server_error"
    };
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { 
    auth: { persistSession: false }
  });

  try {
    // Get token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT and check user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      const errorDetails = userError ? `: ${userError.message}` : '';
      console.error(`Authentication error${errorDetails}`);
      
      return {
        success: false,
        error: 'Unauthorized: Invalid user token',
        code: "auth_error"
      };
    }

    console.log(`Authenticated user: ${user.id}, checking admin role`);

    // Check if the user is an admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error("Role check error:", roleError);
      return {
        success: false,
        error: 'Error checking user permissions',
        code: "permission_error"
      };
    }
    
    if (!roleData) {
      console.log(`User ${user.id} does not have admin role`);
      return {
        success: false,
        error: 'Forbidden: Admin access required',
        code: "access_denied"
      };
    }

    return {
      success: true,
      user
    };
  } catch (error) {
    console.error('Error in authentication:', error);
    return {
      success: false,
      error: error.message || 'Authentication failed',
      code: "auth_error"
    };
  }
}

export function createSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  return createClient(supabaseUrl, supabaseServiceKey, { 
    auth: { persistSession: false }
  });
}
