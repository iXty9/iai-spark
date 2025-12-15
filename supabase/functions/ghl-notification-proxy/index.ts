import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_WEBHOOK_URL = 'https://n8n.ixty.ai:5679/webhook/9e16570c-ae25-422a-9418-46cac1e285ed';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log(`[ghl-notification-proxy] Received notification type: ${payload.type || 'unknown'}`);

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

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Forward to n8n
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichedPayload)
    });

    console.log(`[ghl-notification-proxy] n8n response: ${n8nResponse.status}`);

    return new Response(
      JSON.stringify({ success: true, forwarded: true }),
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
