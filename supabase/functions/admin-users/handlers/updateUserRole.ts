
import { createSupabaseAdminClient } from "../auth.ts";
import { createJsonResponse } from "../cors.ts";

export async function handleUpdateUserRole(params: any): Promise<Response> {
  const { userId, role } = params || {};

  if (!userId || !role) {
    return createJsonResponse({ error: 'User ID and role are required' }, 400);
  }

  try {
    console.log(`Updating user ${userId} role to ${role}`);
    
    const supabaseAdmin = createSupabaseAdminClient();
    
    // Check if user exists
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData?.user) {
      return createJsonResponse({ error: 'User not found' }, 404);
    }

    // Check if user already has a role
    const { data: existingRole, error: checkError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) throw checkError;

    let updateResult;
    
    if (existingRole) {
      // Update existing role
      updateResult = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
    } else {
      // Insert new role
      updateResult = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role });
    }

    if (updateResult.error) throw updateResult.error;

    return createJsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    return createJsonResponse({ error: `Failed to update user role: ${error.message}` }, 500);
  }
}
