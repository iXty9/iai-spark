import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyGHLSignature, createUnauthorizedResponse } from '../_shared/ghl-signature-verify.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wh-signature',
};

/**
 * Generate a composite deduplication key from event data.
 * This handles HighLevel's behavior of sending multiple webhooks with different
 * webhookIds for the same logical event.
 */
function generateDedupKey(payload: any): string {
  const eventType = payload.type || 'unknown';
  
  // Extract entity ID based on event type
  let entityId = '';
  if (payload.appointment?.id) entityId = payload.appointment.id;
  else if (payload.contact?.id) entityId = payload.contact.id;
  else if (payload.opportunity?.id) entityId = payload.opportunity.id;
  else if (payload.task?.id) entityId = payload.task.id;
  else if (payload.note?.id) entityId = payload.note.id;
  else if (payload.id) entityId = payload.id;
  
  // Create 10-second time window bucket (floor to nearest 10 seconds)
  const timeWindow = Math.floor(Date.now() / 10000);
  
  return `composite_${eventType}_${entityId}_${timeWindow}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Clone request to read body twice (once for verification, once for parsing)
    const rawBody = await req.text();
    
    // Verify GHL signature before processing
    const verifyResult = await verifyGHLSignature(req, rawBody);
    if (!verifyResult.valid) {
      console.error('[ghl-notification-proxy] Signature verification failed:', verifyResult.error);
      return createUnauthorizedResponse(verifyResult.error || 'Invalid signature', corsHeaders);
    }
    
    console.log('[ghl-notification-proxy] Signature verified successfully');
    
    // Parse the verified payload
    const payload = JSON.parse(rawBody);
    const webhookId = payload.webhookId;
    const compositeKey = generateDedupKey(payload);
    
    console.log(`[ghl-notification-proxy] Received: type=${payload.type || 'unknown'}, webhookId=${webhookId || 'none'}, compositeKey=${compositeKey}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch configuration from app_settings (notification webhook URL and proxy secret)
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['ghl_notification_webhook_url', 'ghl_proxy_secret']);

    if (settingsError) {
      console.error('[ghl-notification-proxy] Failed to fetch settings:', settingsError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notificationWebhookUrl = settingsData?.find(s => s.key === 'ghl_notification_webhook_url')?.value;
    const proxySecret = settingsData?.find(s => s.key === 'ghl_proxy_secret')?.value;

    if (!notificationWebhookUrl) {
      console.error('[ghl-notification-proxy] No notification webhook URL configured');
      return new Response(
        JSON.stringify({ error: 'Notification webhook URL not configured. Set it in Admin Panel > HighLevel.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ghl-notification-proxy] Using webhook URL: ${notificationWebhookUrl.substring(0, 50)}...`);

    // Helper function for duplicate responses
    const duplicateResponse = (reason: string, key: string) => {
      console.log(`[ghl-notification-proxy] Duplicate webhook skipped (${reason}): ${key}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'duplicate', dedup_key: key }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    };

    // Step 1: Check webhookId first (fastest path for true duplicates)
    if (webhookId) {
      const { data: existingWebhookId } = await supabase
        .from('ghl_webhook_dedup')
        .select('webhook_id')
        .eq('webhook_id', webhookId)
        .maybeSingle();

      if (existingWebhookId) {
        return duplicateResponse('webhookId', webhookId);
      }
    }

    // Step 2: Check composite key for same-event duplicates from HighLevel
    const { data: existingComposite } = await supabase
      .from('ghl_webhook_dedup')
      .select('webhook_id')
      .eq('webhook_id', compositeKey)
      .maybeSingle();

    if (existingComposite) {
      return duplicateResponse('composite', compositeKey);
    }

    // Step 3: Record BOTH keys to prevent future duplicates (with race condition protection)
    const keysToInsert = [{ webhook_id: compositeKey }];
    if (webhookId && webhookId !== compositeKey) {
      keysToInsert.push({ webhook_id: webhookId });
    }

    // Use upsert with ignoreDuplicates to handle race conditions atomically
    const { error: upsertError } = await supabase
      .from('ghl_webhook_dedup')
      .upsert(keysToInsert, { onConflict: 'webhook_id', ignoreDuplicates: true });

    if (upsertError) {
      // Log but don't fail - could be a race condition where another instance inserted first
      console.warn(`[ghl-notification-proxy] Dedup upsert warning: ${upsertError.message}`);
    }

    // Step 4: Periodically clean up old records (~1% of requests to avoid overhead)
    if (Math.random() < 0.01) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { error: cleanupError } = await supabase
        .from('ghl_webhook_dedup')
        .delete()
        .lt('created_at', oneHourAgo);
      
      if (cleanupError) {
        console.warn(`[ghl-notification-proxy] Cleanup warning: ${cleanupError.message}`);
      } else {
        console.log('[ghl-notification-proxy] Cleaned up old dedup records (>1 hour)');
      }
    }

    // Extract locationId - check top level first, then common nested locations
    const locationId = payload.locationId 
      || payload.appointment?.locationId
      || payload.contact?.locationId
      || payload.opportunity?.locationId
      || payload.task?.locationId
      || payload.note?.locationId;

    if (!locationId) {
      console.warn('[ghl-notification-proxy] No locationId found in payload');
      return new Response(
        JSON.stringify({ error: 'No locationId in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ghl-notification-proxy] Looking up user for locationId: ${locationId}`);

    // Look up user_id from ghl_installations
    const { data: installation, error: lookupError } = await supabase
      .from('ghl_installations')
      .select('user_id')
      .eq('location_id', locationId)
      .eq('connection_status', 'connected')
      .maybeSingle();

    if (lookupError) {
      console.error('[ghl-notification-proxy] Lookup error:', lookupError.message);
      return new Response(
        JSON.stringify({ error: 'Database lookup failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!installation?.user_id) {
      console.warn(`[ghl-notification-proxy] No connected installation found for locationId: ${locationId}`);
      return new Response(
        JSON.stringify({ error: 'No user found for this location' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inject ixty_user_id into payload
    const enrichedPayload = {
      ...payload,
      ixty_user_id: installation.user_id
    };

    console.log(`[ghl-notification-proxy] Forwarding to n8n with ixty_user_id: ${installation.user_id}`);

    // Forward to n8n with proxy secret for authentication
    const forwardHeaders: Record<string, string> = { 
      'Content-Type': 'application/json' 
    };
    if (proxySecret) {
      forwardHeaders['X-Ixty-Proxy-Secret'] = proxySecret;
    }

    const n8nResponse = await fetch(notificationWebhookUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(enrichedPayload)
    });

    console.log(`[ghl-notification-proxy] n8n response: ${n8nResponse.status}`);

    return new Response(
      JSON.stringify({ success: true, forwarded: true, dedup_keys: keysToInsert.map(k => k.webhook_id) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ghl-notification-proxy] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
