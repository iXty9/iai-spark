
import { createSupabaseAdminClient } from "../auth.ts";
import { createJsonResponse } from "../cors.ts";

export async function handleListUsers(params: any): Promise<Response> {
  const { page = 1, pageSize = 10, roleFilter } = params || {};

  try {
    console.log(`Fetching users - page: ${page}, pageSize: ${pageSize}, roleFilter: ${roleFilter}`);
    
    const supabaseAdmin = createSupabaseAdminClient();
    
    // Get users with admin API
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: page - 1, // Supabase uses 0-indexed pages
      perPage: pageSize,
    });

    if (usersError) throw usersError;

    // Get total count
    const totalCount = usersData?.total_count || 0;
    console.log(`Total users count: ${totalCount}`);

    // Get all roles
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) throw rolesError;

    // Get all profiles for usernames
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, username');

    if (profilesError) {
      console.warn('Error fetching profiles:', profilesError);
    }

    // Create maps for efficient lookup
    const roleMap = {};
    roles?.forEach((role) => {
      roleMap[role.user_id] = role.role;
    });

    const usernameMap = {};
    profiles?.forEach((profile) => {
      if (profile.username) {
        usernameMap[profile.id] = profile.username;
      }
    });

    // Map users with roles and usernames
    let mappedUsers = usersData.users.map(user => ({
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      role: roleMap[user.id] || 'user',
      username: usernameMap[user.id]
    }));

    // Apply role filter if specified
    if (roleFilter) {
      mappedUsers = mappedUsers.filter(user => user.role === roleFilter);
    }

    return createJsonResponse({ 
      users: mappedUsers, 
      totalCount: totalCount 
    });
  } catch (error) {
    console.error('Error in listUsers:', error);
    return createJsonResponse({ 
      error: `Failed to fetch users: ${error.message}`,
      users: [],
      totalCount: 0
    }, 500);
  }
}
