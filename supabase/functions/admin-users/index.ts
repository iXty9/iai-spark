
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create Supabase client with service role
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  // Verify the user calling the function has admin rights
  try {
    // Get token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT and check user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the user is an admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request JSON
    const { action, params } = await req.json();

    // Handle different actions
    switch (action) {
      case 'listUsers':
        return await handleListUsers(supabaseAdmin, params, corsHeaders);
      case 'searchUsers':
        return await handleSearchUsers(supabaseAdmin, params, corsHeaders);
      case 'updateUserRole':
        return await handleUpdateUserRole(supabaseAdmin, params, corsHeaders);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleListUsers(supabaseAdmin, params, corsHeaders) {
  const { page = 1, pageSize = 10, roleFilter } = params || {};

  try {
    console.log(`Fetching users - page: ${page}, pageSize: ${pageSize}, roleFilter: ${roleFilter}`);
    
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

    return new Response(
      JSON.stringify({ 
        users: mappedUsers, 
        totalCount: totalCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in listUsers:', error);
    return new Response(
      JSON.stringify({ 
        error: `Failed to fetch users: ${error.message}`,
        users: [],
        totalCount: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleSearchUsers(supabaseAdmin, params, corsHeaders) {
  const { searchQuery, page = 1, pageSize = 10, roleFilter } = params || {};
  
  try {
    console.log(`Searching users - query: "${searchQuery}", page: ${page}, pageSize: ${pageSize}, roleFilter: ${roleFilter}`);
    
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

    return new Response(
      JSON.stringify({ 
        users: paginatedUsers, 
        totalCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in searchUsers:', error);
    return new Response(
      JSON.stringify({ 
        error: `Failed to search users: ${error.message}`,
        users: [],
        totalCount: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleUpdateUserRole(supabaseAdmin, params, corsHeaders) {
  const { userId, role } = params || {};

  if (!userId || !role) {
    return new Response(
      JSON.stringify({ error: 'User ID and role are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log(`Updating user ${userId} role to ${role}`);
    
    // Check if user exists
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating user role:', error);
    return new Response(
      JSON.stringify({ error: `Failed to update user role: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
