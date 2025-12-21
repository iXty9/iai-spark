import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyGHLSignature, createUnauthorizedResponse } from '../_shared/ghl-signature-verify.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wh-signature',
};

interface GHLInstallWebhook {
  type: 'INSTALL' | 'UNINSTALL';
  appId: string;
  locationId?: string;
  companyId?: string;
  companyName?: string;
  userId?: string; // GHL user ID
  installType?: string;
  timestamp: string;
  webhookId: string;
  whitelabelDetails?: {
    logoUrl?: string;
    domain?: string;
  };
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
      console.error('[ghl-install-webhook] Signature verification failed:', verifyResult.error);
      return createUnauthorizedResponse(verifyResult.error || 'Invalid signature', corsHeaders);
    }
    
    console.log('[ghl-install-webhook] Signature verified successfully');
    
    // Parse the verified payload
    const payload: GHLInstallWebhook = JSON.parse(rawBody);
    
    console.log('[ghl-install-webhook] Received webhook:', JSON.stringify(payload, null, 2));

    const { type, locationId, companyId, companyName, userId: ghlUserId } = payload;

    if (!type) {
      console.error('[ghl-install-webhook] Missing webhook type');
      return new Response(
        JSON.stringify({ error: 'Missing webhook type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[ghl-install-webhook] Supabase credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (type === 'INSTALL') {
      if (!locationId) {
        console.error('[ghl-install-webhook] INSTALL webhook missing locationId');
        return new Response(
          JSON.stringify({ error: 'Missing locationId for INSTALL webhook' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[ghl-install-webhook] Processing INSTALL for location:', locationId);

      // Check if there's already an installation for this location
      const { data: existing } = await supabase
        .from('ghl_installations')
        .select('id, user_id, connection_status')
        .eq('location_id', locationId)
        .maybeSingle();

      if (existing) {
        console.log('[ghl-install-webhook] Installation already exists:', existing.id);
        // If already connected to a user, don't overwrite
        if (existing.user_id && existing.connection_status === 'connected') {
          return new Response(
            JSON.stringify({ success: true, message: 'Installation already exists and is connected' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Update existing pending record
        const { error: updateError } = await supabase
          .from('ghl_installations')
          .update({
            company_id: companyId || null,
            company_name: companyName || null,
            ghl_user_id: ghlUserId || null,
            connection_status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('[ghl-install-webhook] Failed to update installation:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update installation', details: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[ghl-install-webhook] Updated existing pending installation');
        return new Response(
          JSON.stringify({ success: true, message: 'Installation updated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create new pending installation (no user_id yet - will be linked during OAuth)
      const { data, error: insertError } = await supabase
        .from('ghl_installations')
        .insert({
          location_id: locationId,
          company_id: companyId || null,
          company_name: companyName || null,
          ghl_user_id: ghlUserId || null,
          connection_status: 'pending',
          // user_id is null - will be set when user completes OAuth
        })
        .select()
        .single();

      if (insertError) {
        console.error('[ghl-install-webhook] Failed to create installation:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create installation', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[ghl-install-webhook] Created pending installation:', data.id);
      return new Response(
        JSON.stringify({ success: true, message: 'Pending installation created', id: data.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (type === 'UNINSTALL') {
      if (!locationId) {
        console.error('[ghl-install-webhook] UNINSTALL webhook missing locationId');
        return new Response(
          JSON.stringify({ error: 'Missing locationId for UNINSTALL webhook' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[ghl-install-webhook] Processing UNINSTALL for location:', locationId);

      // DELETE the installation record entirely
      const { error: deleteError } = await supabase
        .from('ghl_installations')
        .delete()
        .eq('location_id', locationId);

      if (deleteError) {
        console.error('[ghl-install-webhook] Failed to delete installation:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to process uninstall', details: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[ghl-install-webhook] Deleted installation for location:', locationId);
      return new Response(
        JSON.stringify({ success: true, message: 'Installation deleted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      console.log('[ghl-install-webhook] Unknown webhook type:', type);
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook type not handled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[ghl-install-webhook] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
