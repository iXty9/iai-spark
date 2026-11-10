import { getValidAccessToken } from '../_shared/ghl-token-manager.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface RefreshResult {
  userId: string;
  locationId: string;
  success: boolean;
  error?: string;
  newExpiresAt?: string;
}

async function refreshInstallationToken(
  supabase: any,
  installation: any,
  clientId: string,
  clientSecret: string,
  encryptionKey: string
): Promise<RefreshResult> {
  const result: RefreshResult = {
    userId: installation.user_id,
    locationId: installation.location_id,
    success: false,
  };

  try {
    const out = await getValidAccessToken(supabase, installation.id, { skewMs: 6 * 60 * 60 * 1000, source: 'cron' });
    if (!out.ok) {
      result.error = `${out.reason}: ${out.detail}`;
      return result;
    }
    result.success = true;
    result.newExpiresAt = out.expiresAt;
    return result;

  } catch (error) {
    console.error(`[ghl-cron] Error refreshing ${installation.location_id}:`, error);
    
    // Update installation with error
    await supabase
      .from('ghl_installations')
      .update({
        connection_status: 'error',
        refresh_error: `Cron refresh error: ${error.message}`,
      })
      .eq('id', installation.id);

    result.error = error.message;
    return result;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[ghl-cron] Starting proactive token refresh job');

  try {
    const clientId = Deno.env.get('GHL_CLIENT_ID');
    const clientSecret = Deno.env.get('GHL_CLIENT_SECRET');
    const encryptionKey = Deno.env.get('GHL_TOKEN_ENCRYPTION_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret || !encryptionKey) {
      console.error('[ghl-cron] Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Find all installations that:
    // 1. Have connected status
    // 2. Token expires within 6 hours
    // 3. Have encrypted refresh token
    const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    
    const { data: expiringInstallations, error: queryError } = await supabase
      .from('ghl_installations')
      .select('*')
      .eq('connection_status', 'connected')
      .lt('token_expires_at', sixHoursFromNow)
      .not('refresh_token_encrypted', 'is', null);

    if (queryError) {
      console.error('[ghl-cron] Query error:', queryError);
      return new Response(
        JSON.stringify({ error: 'Database query failed', details: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!expiringInstallations || expiringInstallations.length === 0) {
      console.log('[ghl-cron] No tokens expiring soon, nothing to refresh');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No tokens expiring soon',
          refreshed: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ghl-cron] Found ${expiringInstallations.length} installation(s) to refresh`);

    // Refresh each installation
    const results: RefreshResult[] = [];
    for (const installation of expiringInstallations) {
      const result = await refreshInstallationToken(
        supabase,
        installation,
        clientId,
        clientSecret,
        encryptionKey
      );
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`[ghl-cron] Completed: ${successCount} refreshed, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Proactive refresh complete`,
        refreshed: successCount,
        failed: failedCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ghl-cron] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
