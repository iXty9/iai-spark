/**
 * GHL Webhook Signature Verification Utility
 * 
 * Verifies webhooks from GoHighLevel using RSA-SHA256 signature validation.
 * Reference: https://marketplace.gohighlevel.com/docs/oauth/ExternalAuthentication
 */

export interface SignatureVerifyResult {
  valid: boolean;
  error?: string;
}

// GHL's RSA public key for webhook signature verification
// This is a PUBLIC key - safe to include in code
// Retrieved from GHL marketplace documentation
const GHL_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAynVb3fXhBI2CoBlStCAT
s3K6NSKMvVBIHWQadkqnyhAPWC3joHtq+mJgKFXvwkeKnIZKTtCA03Fd/gqGsEoN
RNaiUB1JF52d0XPV1nqBDDVTeVWkKfyqLQfvPCZuVeVzn+k98YOddliY0vL5TQFN
A9Dw8nHJTW2SNFNknVDN8rQIg7Dw8WP6ldLzBfaIjT0JTXSB9dGH6rMAZFL7+zE
3UW8C/OJwNMGnmWY4cqE62tHUCJdIVJh89hkGwUMlJMBxQAM3l0cLEXJ/IpKvnIc
wLtNc6yF0M2dRwQUEvdFv+VJBRk4pWwUk0mCPB0wqPF2IY4fB8mAqB03H3IKmgfN
pwIDAQAB
-----END PUBLIC KEY-----`;

// Replay protection: reject webhooks older than this (in milliseconds)
const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Convert a PEM-encoded public key to ArrayBuffer for Web Crypto API
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Remove PEM headers and newlines
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');
  
  // Decode base64 to binary
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Decode a base64-encoded signature to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Verify GHL webhook signature using RSA-SHA256
 * 
 * @param request - The incoming request (to extract headers)
 * @param rawBody - The raw request body string (signature is computed over this)
 * @returns Verification result with valid flag and optional error message
 */
export async function verifyGHLSignature(
  request: Request,
  rawBody: string
): Promise<SignatureVerifyResult> {
  // Extract signature from header
  const signature = request.headers.get('x-wh-signature');
  
  if (!signature) {
    console.warn('[ghl-signature-verify] Missing x-wh-signature header');
    return { valid: false, error: 'Missing x-wh-signature header' };
  }

  // Parse body to check timestamp for replay protection
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error('[ghl-signature-verify] Failed to parse request body:', e);
    return { valid: false, error: 'Invalid JSON body' };
  }

  // Replay protection: Check timestamp
  const timestamp = payload.timestamp;
  if (timestamp) {
    const webhookTime = new Date(timestamp).getTime();
    const now = Date.now();
    const age = now - webhookTime;
    
    if (age > MAX_WEBHOOK_AGE_MS) {
      console.warn(`[ghl-signature-verify] Webhook too old: ${age}ms (max: ${MAX_WEBHOOK_AGE_MS}ms)`);
      return { valid: false, error: 'Webhook timestamp too old (replay protection)' };
    }
    
    // Also reject webhooks from the future (clock skew protection)
    if (age < -60000) { // Allow 1 minute of clock skew
      console.warn(`[ghl-signature-verify] Webhook from future: ${-age}ms ahead`);
      return { valid: false, error: 'Webhook timestamp in future' };
    }
  } else {
    console.log('[ghl-signature-verify] No timestamp in payload, skipping replay protection');
  }

  try {
    // Import GHL's RSA public key
    const publicKey = await crypto.subtle.importKey(
      'spki',
      pemToArrayBuffer(GHL_PUBLIC_KEY_PEM),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode the base64 signature
    const signatureBuffer = base64ToArrayBuffer(signature);
    
    // Encode the raw body as bytes
    const bodyBuffer = new TextEncoder().encode(rawBody);

    // Verify the signature
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signatureBuffer,
      bodyBuffer
    );

    if (isValid) {
      console.log('[ghl-signature-verify] Signature verified successfully');
      return { valid: true };
    } else {
      console.warn('[ghl-signature-verify] Signature verification failed');
      return { valid: false, error: 'Invalid signature' };
    }
  } catch (error) {
    console.error('[ghl-signature-verify] Verification error:', error);
    return { valid: false, error: `Verification error: ${error.message}` };
  }
}

/**
 * Helper to create a 401 Unauthorized response with CORS headers
 */
export function createUnauthorizedResponse(
  error: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error: 'Unauthorized', details: error }),
    { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
