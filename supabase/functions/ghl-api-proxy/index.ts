import { getValidAccessToken as sharedGetToken } from '../_shared/ghl-token-manager.ts';
import { fenceProxyRequest } from '../_shared/ghl-api-proxy-fence-core.ts';
import { safeEqual } from '../_shared/proactive-auth-core.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ixty-proxy-secret',
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

/**
 * Detect endpoint pattern for logging
 */
function getEndpointPattern(endpoint: string, method: string): string {
  const upperMethod = method.toUpperCase();
  const normalizedEndpoint = endpoint.toLowerCase();
  
  if (normalizedEndpoint === '/contacts' && upperMethod === 'POST') return 'contacts-create';
  if (normalizedEndpoint === '/contacts/upsert' && upperMethod === 'POST') return 'contacts-upsert';
  if (/^\/contacts\/[^\/]+$/.test(normalizedEndpoint) && upperMethod === 'PUT') return 'contacts-update';
  return 'generic';
}

/**
 * Process request body based on endpoint-specific requirements.
 * Different GHL API endpoints have different rules for fields like locationId and id.
 * 
 * - POST /contacts: Strip 'id', inject locationId (required for create)
 * - POST /contacts/upsert: Strip 'id', inject locationId (required for upsert)
 * - PUT /contacts/{id}: Strip both 'id' and 'locationId' (v2 API rejects them)
 * - All other endpoints: Inject locationId if missing (existing behavior)
 */
function processBodyForEndpoint(
  endpoint: string,
  method: string,
  body: Record<string, any> | undefined,
  locationId: string | null
): Record<string, any> | undefined {
  if (!body) return undefined;
  
  const upperMethod = method.toUpperCase();
  const normalizedEndpoint = endpoint.toLowerCase();
  
  // Clone the body to avoid mutating the original
  const processedBody = { ...body };
  
  // Detect endpoint patterns
  const isContactsCreate = normalizedEndpoint === '/contacts' && upperMethod === 'POST';
  const isContactsUpsert = normalizedEndpoint === '/contacts/upsert' && upperMethod === 'POST';
  const isContactsUpdate = /^\/contacts\/[^\/]+$/.test(normalizedEndpoint) && upperMethod === 'PUT';
  const isConversationsEndpoint = normalizedEndpoint.startsWith('/conversations');
  const isInvoicesEndpoint = normalizedEndpoint.startsWith('/invoices');
  
  // Contact sub-resource endpoints: tags, notes, tasks, followers, campaigns, workflow
  // These only need locationId in query string, NOT in body
  const isContactSubResource = /^\/contacts\/[^\/]+\/(tags|notes|tasks|followers|campaigns|workflow)$/i.test(normalizedEndpoint);
  
  if (isContactSubResource) {
    // Contact sub-resource endpoints only accept their specific payload
    // locationId is handled in query string, not body
    delete processedBody.locationId;
    console.log(`[ghl-api-proxy] Contact sub-resource endpoint: stripped 'locationId' from body (uses query string only)`);
  } else if (isContactsCreate || isContactsUpsert) {
    // POST /contacts or POST /contacts/upsert:
    // - Strip 'id' (not allowed on create/upsert)
    // - Inject locationId (required)
    delete processedBody.id;
    if (locationId) {
      // ALWAYS use the correct locationId - don't trust caller's value
      if (processedBody.locationId && processedBody.locationId !== locationId) {
        console.log(`[ghl-api-proxy] Overriding incorrect locationId in body: ${processedBody.locationId} -> ${locationId}`);
      }
      processedBody.locationId = locationId;
    }
    console.log(`[ghl-api-proxy] Contacts create/upsert: stripped 'id', using locationId: ${locationId}`);
  } else if (isContactsUpdate) {
    // PUT /contacts/{id}:
    // - Strip 'id' (id is in URL path, not body)
    // - Strip 'locationId' (v2 API rejects it on update)
    delete processedBody.id;
    delete processedBody.locationId;
    console.log(`[ghl-api-proxy] Contacts update: stripped 'id' and 'locationId' from body`);
  } else if (isConversationsEndpoint) {
    // Conversations API: locationId goes in query string only, NOT in body
    // GHL returns 400 Bad Request if locationId is in the body
    delete processedBody.locationId;
    console.log(`[ghl-api-proxy] Conversations endpoint: stripped 'locationId' from body (uses query string)`);
  } else if (isInvoicesEndpoint) {
    // Invoice endpoints behavior depends on HTTP method:
    // - GET: altId/altType in query string only, not in body
    // - POST/PUT (record-payment, send, void): altId/altType REQUIRED in body
    if (upperMethod === 'GET') {
      delete processedBody.altId;
      delete processedBody.altType;
      delete processedBody.locationId;
      console.log(`[ghl-api-proxy] Invoice GET endpoint: stripped altId/altType from body (uses query string)`);
    } else {
      // POST/PUT invoice endpoints need altId/altType in body - INJECT correct values
      if (processedBody.altId && processedBody.altId !== locationId) {
        console.log(`[ghl-api-proxy] Overriding incorrect altId in invoice body: ${processedBody.altId} -> ${locationId}`);
      }
      processedBody.altId = locationId;
      processedBody.altType = 'location';
      delete processedBody.locationId; // Not used for invoice endpoints
      console.log(`[ghl-api-proxy] Invoice POST/PUT endpoint: injected altId=${locationId}, altType=location into body`);
    }
  } else {
    // All other endpoints: ALWAYS use the correct locationId - don't trust caller's value
    if (locationId) {
      if (processedBody.locationId && processedBody.locationId !== locationId) {
        console.log(`[ghl-api-proxy] Overriding incorrect locationId in body: ${processedBody.locationId} -> ${locationId}`);
      }
      processedBody.locationId = locationId;
    }
  }
  
  return processedBody;
}

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

// Delegates to the shared token manager (single-writer refresh).
async function getValidAccessToken(
  supabase: any,
  installation: any,
  _encryptionKey: string,
  _clientId: string,
  _clientSecret: string
): Promise<{ accessToken: string; error?: string }> {
  const out = await sharedGetToken(supabase, installation.id, { source: 'proxy' });
  if (!out.ok) return { accessToken: '', error: `Token unavailable (${out.reason}): ${out.detail}` };
  return { accessToken: out.accessToken };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client early to fetch proxy secret from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[ghl-api-proxy] Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Shared password is server-only (function secret), never in app_settings.
    const expectedSecret = Deno.env.get('GHL_PROXY_SECRET');
    if (!expectedSecret || expectedSecret.length < 32) {
      console.error('[ghl-api-proxy] GHL_PROXY_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Proxy not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!safeEqual(req.headers.get('x-ixty-proxy-secret'), expectedSecret)) {
      console.error('[ghl-api-proxy] Invalid or missing proxy secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { user_id, endpoint, method = 'GET', body, query } = await req.json();

    const fence = fenceProxyRequest(method, endpoint);
    if (!fence.ok) {
      console.warn(`[ghl-api-proxy] fenced: ${fence.code}`);
      return new Response(
        JSON.stringify({ error: 'Not allowed through the legacy proxy; use CMS v2 tools', code: fence.code }),
        { status: fence.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Get environment variables for GHL
    const clientId = Deno.env.get('GHL_CLIENT_ID');
    const clientSecret = Deno.env.get('GHL_CLIENT_SECRET');
    const encryptionKey = Deno.env.get('GHL_TOKEN_ENCRYPTION_KEY');

    if (!clientId || !clientSecret || !encryptionKey) {
      console.error('[ghl-api-proxy] Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!clientId || !clientSecret || !encryptionKey) {
      console.error('[ghl-api-proxy] Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Normalize endpoint - ensure proper trailing slashes for endpoints that require them
    let normalizedEndpoint = endpoint;
    
    // Endpoints that require trailing slashes (GHL API quirk)
    const trailingSlashEndpoints = ['/invoices', '/payments', '/subscriptions'];
    const endpointLower = endpoint.toLowerCase().replace(/\/$/, ''); // Remove any existing trailing slash for comparison
    
    for (const pattern of trailingSlashEndpoints) {
      // Check if endpoint matches the pattern (exact match or starts with pattern/)
      if (endpointLower === pattern || endpointLower.startsWith(`${pattern}/`)) {
        // Ensure trailing slash if endpoint ends with the base pattern (no sub-resource)
        if (endpointLower === pattern && !endpoint.endsWith('/')) {
          normalizedEndpoint = endpoint + '/';
          console.log(`[ghl-api-proxy] Auto-added trailing slash: ${endpoint} -> ${normalizedEndpoint}`);
        }
        break;
      }
    }
    
    // Build GHL API URL with query parameters
    let ghlUrl = `${GHL_BASE_URL}${normalizedEndpoint}`;
    const endpointForMatching = normalizedEndpoint.toLowerCase();
    
    // Determine which endpoints need locationId auto-injection
    // Invoices API uses altId/altType instead of locationId - do NOT inject locationId
    const usesAltIdPattern = endpointForMatching.startsWith('/invoices');
    const needsLocationIdInQuery = !usesAltIdPattern && (
      endpointForMatching.startsWith('/contacts') ||
      endpointForMatching.startsWith('/opportunities') ||
      endpointForMatching.startsWith('/tasks') ||
      endpointForMatching.startsWith('/calendars') ||
      endpointForMatching.startsWith('/conversations')
    );
    
    // Build final query - inject correct location parameters based on endpoint pattern
    const finalQuery: Record<string, any> = { ...(query || {}) };
    
    if (installation.location_id) {
      if (usesAltIdPattern) {
        // Invoice endpoints use altId/altType instead of locationId
        // ALWAYS use the user's installation location_id - don't trust caller's value
        // This prevents AI agents from using stale/wrong altId values
        if (finalQuery.altId && finalQuery.altId !== installation.location_id) {
          console.log(`[ghl-api-proxy] Overriding incorrect altId: ${finalQuery.altId} -> ${installation.location_id}`);
        }
        finalQuery.altId = installation.location_id;
        finalQuery.altType = 'location';
        console.log(`[ghl-api-proxy] Using altId from installation: ${installation.location_id}`);
      } else if (needsLocationIdInQuery) {
        // Other endpoints use locationId in query
        // ALWAYS use the user's installation location_id - don't trust caller's value
        if (finalQuery.locationId && finalQuery.locationId !== installation.location_id) {
          console.log(`[ghl-api-proxy] Overriding incorrect locationId in query: ${finalQuery.locationId} -> ${installation.location_id}`);
        }
        finalQuery.locationId = installation.location_id;
      }
    }

    // Process body with endpoint-specific rules for Contacts API
    // Note: Invoices API uses altId/altType in query params, not body, so body processing is fine
    const finalBody = processBodyForEndpoint(
      normalizedEndpoint,
      method,
      body,
      installation.location_id // Always pass location_id - function handles endpoint-specific logic
    );
    
    console.log(`[ghl-api-proxy] Endpoint pattern: ${getEndpointPattern(normalizedEndpoint, method)}${usesAltIdPattern ? ' (uses altId/altType)' : ''}`);
    if (finalBody) {
      console.log(`[ghl-api-proxy] Processed body keys: ${Object.keys(finalBody).join(', ')}`);
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
