
import { createSupabaseAdminClient } from "../auth.ts";
import { createJsonResponse } from "../cors.ts";

export async function handleSearchUsers(params: any): Promise<Response> {
  const { searchQuery, page = 1, pageSize = 10, roleFilter } = params || {};
  
  try {
    console.log(`Searching users - query: "${searchQuery}", page: ${page}, pageSize: ${pageSize}, roleFilter: ${roleFilter}`);
    
    const supabaseAdmin = createSupabaseAdminClient();
    
    // Get all users
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000, // Get a larger batch to search through
    });

    if (usersError) throw usersError;

    // Get roles and profiles
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) throw rolesError;

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, username');

    if (profilesError) {
      console.warn('Error fetching profiles:', profilesError);
    }

    // Create maps
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

    // Map users
    let mappedUsers = usersData.users.map(user => ({
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      role: roleMap[user.id] || 'user',
      username: usernameMap[user.id]
    }));

    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      mappedUsers = mappedUsers.filter(user => 
        user.email.toLowerCase().includes(query) || 
        (user.username && user.username.toLowerCase().includes(query))
      );
    }

    // Apply role filter
    if (roleFilter) {
      mappedUsers = mappedUsers.filter(user => user.role === roleFilter);
    }

    // Calculate total and paginate
    const totalCount = mappedUsers.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedUsers = mappedUsers.slice(startIndex, startIndex + pageSize);

    return createJsonResponse({ 
      users: paginatedUsers, 
      totalCount 
    });
  } catch (error) {
    console.error('Error in searchUsers:', error);
    return createJsonResponse({ 
      error: `Failed to search users: ${error.message}`,
      users: [],
      totalCount: 0
    }, 500);
  }
}
