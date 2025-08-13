
import { createSupabaseAdminClient } from "../auth.ts";
import { createJsonResponse } from "../cors.ts";

// Input validation and sanitization
function sanitizeUserId(userId: string): string {
  // Remove potentially dangerous characters
  return userId.replace(/[^\w-]/g, '');
}

function validateRole(role: string): boolean {
  return ['admin', 'moderator', 'user'].includes(role.toLowerCase().trim());
}

export async function handleUpdateUserRole(params: any): Promise<Response> {
  const { userId, role } = params || {};

  if (!userId || !role) {
    return createJsonResponse({ error: 'User ID and role are required' }, 400);
  }

  // Validate and sanitize inputs
  const sanitizedUserId = sanitizeUserId(userId);
  const normalizedRole = role.toLowerCase().trim();

  if (!validateRole(normalizedRole)) {
    return createJsonResponse({ error: 'Invalid role specified' }, 400);
  }

  if (sanitizedUserId !== userId) {
    return createJsonResponse({ error: 'Invalid user ID format' }, 400);
  }

  try {
    console.log(`Updating user ${sanitizedUserId} role to ${normalizedRole}`);
    
    const supabaseAdmin = createSupabaseAdminClient();
    
    // Check if user exists
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(sanitizedUserId);
    if (userError || !userData?.user) {
      return createJsonResponse({ error: 'User not found' }, 404);
    }

    // Check if user already has a role
    const { data: existingRole, error: checkError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', sanitizedUserId)
      .maybeSingle();

    if (checkError) throw checkError;

    let updateResult;
    
    if (existingRole) {
      // Update existing role
      updateResult = await supabaseAdmin
        .from('user_roles')
        .update({ role: normalizedRole })
        .eq('user_id', sanitizedUserId);
    } else {
      // Insert new role
      updateResult = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: sanitizedUserId, role: normalizedRole });
    }

    if (updateResult.error) throw updateResult.error;

    return createJsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    return createJsonResponse({ error: `Failed to update user role: ${error.message}` }, 500);
  }
}
