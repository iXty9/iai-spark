import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ixty-proxy-secret',
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

// Decrypt token using Web Crypto API
async function decryptToken(encryptedData: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}

// Encrypt token using Web Crypto API
async function encryptToken(token: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

// Refresh token if needed, returns decrypted access token
async function getValidAccessToken(
  supabase: any,
  installation: any,
  encryptionKey: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; error?: string }> {
  const expiresAt = new Date(installation.token_expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  // If token is still valid, just decrypt and return
  if (expiresAt > fiveMinutesFromNow) {
    console.log('[ghl-api-proxy] Token still valid, using existing token');
    const accessToken = await decryptToken(installation.access_token_encrypted, encryptionKey);
    return { accessToken };
  }

  console.log('[ghl-api-proxy] Token expired or expiring soon, refreshing...');
  
  // Decrypt refresh token
  const refreshToken = await decryptToken(installation.refresh_token_encrypted, encryptionKey);

  // Call GHL token refresh endpoint
  const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('[ghl-api-proxy] Token refresh failed:', errorText);
    
    // Update installation with error
    await supabase
      .from('ghl_installations')
      .update({
        connection_status: 'error',
        refresh_error: `Token refresh failed: ${errorText}`,
      })
      .eq('user_id', installation.user_id);

    return { accessToken: '', error: `Token refresh failed: ${errorText}` };
  }

  const tokenData = await tokenResponse.json();
  const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

  // Encrypt new tokens
  const encryptedAccessToken = await encryptToken(tokenData.access_token, encryptionKey);
  const encryptedRefreshToken = await encryptToken(tokenData.refresh_token, encryptionKey);

  // Update database
  const { error: updateError } = await supabase
    .from('ghl_installations')
    .update({
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      token_expires_at: newExpiresAt.toISOString(),
      last_refresh_at: new Date().toISOString(),
      connection_status: 'connected',
      refresh_error: null,
    })
    .eq('user_id', installation.user_id);

  if (updateError) {
    console.error('[ghl-api-proxy] Failed to update tokens:', updateError);
    return { accessToken: '', error: 'Failed to update tokens in database' };
  }

  console.log('[ghl-api-proxy] Token refreshed successfully');
  return { accessToken: tokenData.access_token };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate proxy secret
    const proxySecret = req.headers.get('x-ixty-proxy-secret');
    const expectedSecret = Deno.env.get('GHL_PROXY_SECRET');
    
    if (!expectedSecret) {
      console.error('[ghl-api-proxy] GHL_PROXY_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Proxy not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!proxySecret || proxySecret !== expectedSecret) {
      console.error('[ghl-api-proxy] Invalid or missing proxy secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { user_id, endpoint, method = 'GET', body, query } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ghl-api-proxy] Request: ${method} ${endpoint} for user ${user_id}`);

    // Get environment variables
    const clientId = Deno.env.get('GHL_CLIENT_ID');
    const clientSecret = Deno.env.get('GHL_CLIENT_SECRET');
    const encryptionKey = Deno.env.get('GHL_TOKEN_ENCRYPTION_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret || !encryptionKey) {
      console.error('[ghl-api-proxy] Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Fetch the user's GHL installation
    const { data: installation, error: fetchError } = await supabase
      .from('ghl_installations')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (fetchError || !installation) {
      console.error('[ghl-api-proxy] Installation not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'GHL installation not found for user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (installation.connection_status === 'pending') {
      return new Response(
        JSON.stringify({ error: 'GHL installation is pending, user must complete OAuth' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get valid access token (refreshing if needed)
    const { accessToken, error: tokenError } = await getValidAccessToken(
      supabase,
      installation,
      encryptionKey,
      clientId,
      clientSecret
    );

    if (tokenError) {
      return new Response(
        JSON.stringify({ error: tokenError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build GHL API URL with query parameters
    let ghlUrl = `${GHL_BASE_URL}${endpoint}`;
    
    // Auto-fill locationId from installation if not provided
    const finalQuery = { ...query };
    const finalBody = body ? { ...body } : undefined;
    
    // Inject locationId where it might be needed
    if (installation.location_id) {
      // For query params
      if (finalQuery && !finalQuery.locationId) {
        finalQuery.locationId = installation.location_id;
      }
      // For body
      if (finalBody && !finalBody.locationId) {
        finalBody.locationId = installation.location_id;
      }
    }

    // Add query parameters to URL
    if (finalQuery && Object.keys(finalQuery).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(finalQuery)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      ghlUrl += `?${params.toString()}`;
    }

    console.log(`[ghl-api-proxy] Calling GHL API: ${method} ${ghlUrl}`);

    // Make the GHL API request
    const ghlRequestOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28',
      },
    };

    // Add body for non-GET requests
    if (method.toUpperCase() !== 'GET' && finalBody) {
      ghlRequestOptions.body = JSON.stringify(finalBody);
    }

    const ghlResponse = await fetch(ghlUrl, ghlRequestOptions);
    
    // Get response as text first to handle both JSON and non-JSON responses
    const responseText = await ghlResponse.text();
    
    console.log(`[ghl-api-proxy] GHL response status: ${ghlResponse.status}`);

    // Try to parse as JSON, otherwise return as-is
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    // Return the raw GHL response with appropriate status
    return new Response(
      JSON.stringify(responseData),
      { 
        status: ghlResponse.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[ghl-api-proxy] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
