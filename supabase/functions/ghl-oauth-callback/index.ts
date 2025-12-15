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
      locationId: tokenLocationId,
      companyId,
      userId: ghlUserId,
    } = tokenData;

    // Create Supabase client early - needed for pending installation lookup
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Determine locationId - prefer token response, fallback to pending installation
    let locationId = tokenLocationId;
    
    if (!locationId) {
      console.warn('[ghl-oauth-callback] No locationId in token response, checking for pending installation...');
      
      // Look for a pending installation created in the last 5 minutes with no user_id
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: pendingInstallation, error: pendingError } = await supabase
        .from('ghl_installations')
        .select('location_id')
        .is('user_id', null)
        .eq('connection_status', 'pending')
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingError) {
        console.error('[ghl-oauth-callback] Error querying pending installations:', pendingError);
      } else if (pendingInstallation?.location_id) {
        locationId = pendingInstallation.location_id;
        console.log('[ghl-oauth-callback] Found pending installation, using locationId:', locationId);
      }
    }

    // Final check - we must have a locationId from somewhere
    if (!locationId) {
      console.error('[ghl-oauth-callback] No locationId available from token or pending installation');
      return new Response(
        JSON.stringify({ error: 'Unable to determine GHL location. Please try reinstalling the app from the HighLevel Marketplace.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ghl-oauth-callback] Processing OAuth for location:', locationId, 'user:', userId);

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    // Encrypt tokens
    const encryptedAccessToken = await encryptToken(access_token, encryptionKey);
    const encryptedRefreshToken = await encryptToken(refresh_token, encryptionKey);

    console.log('[ghl-oauth-callback] Tokens encrypted successfully');

    // Fetch location name if we have the access token
    let locationName = null;
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

    // Store in database using service role (client already created above)
    // RACE CONDITION FIX: Always upsert by location_id as the unique key
    // This handles both scenarios:
    // 1. OAuth arrives first (before install webhook) - creates record with all data
    // 2. OAuth arrives second (after install webhook created pending) - updates the pending record
    // Using location_id as conflict key ensures one installation per GHL location
    const { data, error: dbError } = await supabase
      .from('ghl_installations')
      .upsert({
        location_id: locationId,
        user_id: userId,
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
        refresh_error: null,
      }, {
        onConflict: 'location_id',
        ignoreDuplicates: false,
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

    console.log('[ghl-oauth-callback] Installation saved successfully for user:', userId, 'location:', locationId);

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
