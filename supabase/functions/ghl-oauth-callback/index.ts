import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple AES encryption for tokens using Web Crypto API
async function encryptToken(token: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  // Create a key from the encryption key string
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  // Combine IV and encrypted data, encode as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, userId } = await req.json();
    
    if (!code) {
      console.error('[ghl-oauth-callback] Missing authorization code');
      return new Response(
        JSON.stringify({ error: 'Missing authorization code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      console.error('[ghl-oauth-callback] Missing user ID');
      return new Response(
        JSON.stringify({ error: 'Missing user ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('GHL_CLIENT_ID');
    const clientSecret = Deno.env.get('GHL_CLIENT_SECRET');
    const encryptionKey = Deno.env.get('GHL_TOKEN_ENCRYPTION_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret) {
      console.error('[ghl-oauth-callback] GHL credentials not configured');
      return new Response(
        JSON.stringify({ error: 'HighLevel credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!encryptionKey) {
      console.error('[ghl-oauth-callback] Encryption key not configured');
      return new Response(
        JSON.stringify({ error: 'Encryption key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ghl-oauth-callback] Exchanging code for tokens...');

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[ghl-oauth-callback] Token exchange failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code', details: errorText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('[ghl-oauth-callback] Token exchange successful');

    const {
      access_token,
      refresh_token,
      expires_in,
      token_type,
      scope,
      locationId,
      companyId,
      userId: ghlUserId,
    } = tokenData;

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    // Encrypt tokens
    const encryptedAccessToken = await encryptToken(access_token, encryptionKey);
    const encryptedRefreshToken = await encryptToken(refresh_token, encryptionKey);

    console.log('[ghl-oauth-callback] Tokens encrypted successfully');

    // Fetch location/company name if we have the access token
    let locationName = null;
    let companyName = null;

    if (locationId) {
      try {
        const locationResponse = await fetch(
          `https://services.leadconnectorhq.com/locations/${locationId}`,
          {
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Version': '2021-07-28',
            },
          }
        );
        if (locationResponse.ok) {
          const locationData = await locationResponse.json();
          locationName = locationData.location?.name || locationData.name;
          console.log('[ghl-oauth-callback] Location name fetched:', locationName);
        }
      } catch (err) {
        console.warn('[ghl-oauth-callback] Failed to fetch location name:', err);
      }
    }

    // Store in database using service role
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const { data, error: dbError } = await supabase
      .from('ghl_installations')
      .upsert({
        user_id: userId,
        location_id: locationId || null,
        company_id: companyId || null,
        ghl_user_id: ghlUserId || null,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: expiresAt.toISOString(),
        scopes: scope || null,
        connection_status: 'connected',
        connected_at: new Date().toISOString(),
        last_refresh_at: new Date().toISOString(),
        location_name: locationName,
        company_name: companyName,
        refresh_error: null,
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[ghl-oauth-callback] Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save installation', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ghl-oauth-callback] Installation saved successfully for user:', userId);

    return new Response(
      JSON.stringify({
        success: true,
        installation: {
          id: data.id,
          location_id: data.location_id,
          location_name: data.location_name,
          company_id: data.company_id,
          scopes: data.scopes,
          connected_at: data.connected_at,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ghl-oauth-callback] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});