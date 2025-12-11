import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { url, method, payload, timeout = 10000, headers: customHeaders } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[webhook-proxy-test] Testing webhook: ${method || 'HEAD'} ${url}`);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const requestOptions: RequestInit = {
        method: method || 'HEAD',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Ixty-Webhook-Tester/1.0',
          ...customHeaders
        }
      };

      // Add body for POST requests
      if (method === 'POST' && payload) {
        requestOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      // Try to get response body for POST requests
      let responseBody = null;
      if (method === 'POST') {
        try {
          const text = await response.text();
          responseBody = text.substring(0, 1000); // Limit response size
        } catch {
          responseBody = null;
        }
      }

      console.log(`[webhook-proxy-test] Response: ${response.status} ${response.statusText}`);

      return new Response(
        JSON.stringify({
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          body: responseBody
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      const isTimeout = errorMessage.includes('abort');
      
      console.error(`[webhook-proxy-test] Fetch error: ${errorMessage}`);

      return new Response(
        JSON.stringify({
          success: false,
          error: isTimeout ? 'Request timed out' : errorMessage,
          isTimeout
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[webhook-proxy-test] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
