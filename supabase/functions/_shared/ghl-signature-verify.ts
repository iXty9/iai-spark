/**
 * GHL Webhook Signature Verification Utility
 *
 * Verifies webhooks from GoHighLevel using RSA-SHA256 signature validation.
 * Reference: https://marketplace.gohighlevel.com/docs/oauth/ExternalAuthentication
 */

export interface SignatureVerifyResult {
  valid: boolean;
  error?: string;
  bypassed?: boolean;
}

// GHL's RSA public key for webhook signature verification
// This is a PUBLIC key - safe to include in code
// Source: GoHighLevel Webhook Integration Guide (4096-bit RSA key)
// https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide
// Verified working as of 2025-12-21.
const GHL_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAokvo/r9tVgcfZ5DysOSC
Frm602qYV0MaAiNnX9O8KxMbiyRKWeL9JpCpVpt4XHIcBOK4u3cLSqJGOLaPuXw6
dO0t6Q/ZVdAV5Phz+ZtzPL16iCGeK9po6D6JHBpbi989mmzMryUnQJezlYJ3DVfB
csedpinheNnyYeFXolrJvcsjDtfAeRx5ByHQmTnSdFUzuAnC9/GepgLT9SM4nCpv
uxmZMxrJt5Rw+VUaQ9B8JSvbMPpez4peKaJPZHBbU3OdeCVx5klVXXZQGNHOs8gF
3kvoV5rTnXV0IknLBXlcKKAQLZcY/Q9rG6Ifi9c+5vqlvHPCUJFT5XUGG5RKgOKU
J062fRtN+rLYZUV+BjafxQauvC8wSWeYja63VSUruvmNj8xkx2zE/Juc+yjLjTXp
IocmaiFeAO6fUtNjDeFVkhf5LNb59vECyrHD2SQIrhgXpO4Q3dVNA5rw576PwTzN
h/AMfHKIjE4xQA1SZuYJmNnmVZLIZBlQAF9Ntd03rfadZ+yDiOXCCs9FkHibELhC
HULgCsnuDJHcrGNd5/Ddm5hxGQ0ASitgHeMZ0kcIOwKDOzOU53lDza6/Y09T7sYJ
PQe7z0cvj7aE4B+Ax1ZoZGPzpJlZtGXCsu9aTEGEnKzmsFqwcSsnw3JB31IGKAyk
T1hhTiaCeIY/OwwwNUY2yvcCAwEAAQ==
-----END PUBLIC KEY-----`;

// Replay protection: reject webhooks older than this (in milliseconds)
const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Convert a PEM-encoded public key to ArrayBuffer for Web Crypto API
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Remove PEM headers and newlines
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s/g, "");

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
 * Handles both standard base64 and URL-safe base64
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Convert URL-safe base64 to standard base64 if needed
  let standardBase64 = base64.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if needed
  const paddingNeeded = (4 - (standardBase64.length % 4)) % 4;
  standardBase64 += "=".repeat(paddingNeeded);

  const binaryString = atob(standardBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Decode a hex-encoded signature to ArrayBuffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

/**
 * Detect the encoding format of a signature string
 */
function detectSignatureFormat(signature: string): "base64" | "hex" | "unknown" {
  // Check if it's hex (only contains 0-9, a-f, A-F)
  if (/^[0-9a-fA-F]+$/.test(signature) && signature.length % 2 === 0) {
    return "hex";
  }
  // Check if it looks like base64 (contains base64 chars, possibly URL-safe variants)
  if (/^[A-Za-z0-9+/\-_=]+$/.test(signature)) {
    return "base64";
  }
  return "unknown";
}

/**
 * Verify GHL webhook signature using RSA-SHA256
 *
 * @param request - The incoming request (to extract headers)
 * @param rawBody - The raw request body string (signature is computed over this)
 * @param bypassEnabled - If true, skip verification and return success
 * @returns Verification result with valid flag and optional error message
 */
export async function verifyGHLSignature(
  request: Request,
  rawBody: string,
  bypassEnabled: boolean = false,
): Promise<SignatureVerifyResult> {
  // If bypass is enabled, skip verification entirely
  if (bypassEnabled) {
    console.log("[ghl-signature-verify] BYPASS ENABLED - Skipping signature verification");
    return { valid: true, bypassed: true };
  }

  // Extract signatures. Prefer the new Ed25519 scheme when present.
  // GHL sends both headers during the transition; X-WH-Signature is
  // deprecated as of September 1, 2026.
  const ghlSignature = request.headers.get("x-ghl-signature");
  const legacySignature = request.headers.get("x-wh-signature");
  const usingGhlScheme = !!ghlSignature && ghlSignature !== "N/A";
  const signature = usingGhlScheme ? ghlSignature! : legacySignature;

  // Diagnostic logging
  console.log("[ghl-signature-verify] === DIAGNOSTIC INFO ===");
  console.log(`[ghl-signature-verify] x-ghl-signature header present: ${!!ghlSignature}`);
  console.log(`[ghl-signature-verify] x-wh-signature header present: ${!!legacySignature}`);
  console.log(`[ghl-signature-verify] scheme: ${usingGhlScheme ? "ghl (Ed25519)" : "legacy (RSA-SHA256)"}`);
  if (signature) {
    console.log(`[ghl-signature-verify] Signature length: ${signature.length}`);
    console.log(`[ghl-signature-verify] Signature preview: ${signature.substring(0, 50)}...`);
    console.log(`[ghl-signature-verify] Detected format: ${detectSignatureFormat(signature)}`);
  }
  console.log(`[ghl-signature-verify] Raw body length: ${rawBody.length}`);
  console.log(`[ghl-signature-verify] Raw body preview: ${rawBody.substring(0, 100)}...`);
  console.log("[ghl-signature-verify] === END DIAGNOSTIC INFO ===");

  if (!signature || signature === "N/A") {
    console.warn("[ghl-signature-verify] Missing x-ghl-signature / x-wh-signature header");
    return { valid: false, error: "Missing x-ghl-signature (or legacy x-wh-signature) header" };
  }


  // Parse body to check timestamp for replay protection
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error("[ghl-signature-verify] Failed to parse request body:", e);
    return { valid: false, error: "Invalid JSON body" };
  }

  // Replay protection: Check timestamp
  const timestamp = payload.timestamp;
  if (timestamp) {
    const webhookTime = new Date(timestamp).getTime();
    const now = Date.now();
    const age = now - webhookTime;

    if (age > MAX_WEBHOOK_AGE_MS) {
      console.warn(`[ghl-signature-verify] Webhook too old: ${age}ms (max: ${MAX_WEBHOOK_AGE_MS}ms)`);
      return { valid: false, error: "Webhook timestamp too old (replay protection)" };
    }

    // Also reject webhooks from the future (clock skew protection)
    if (age < -60000) {
      // Allow 1 minute of clock skew
      console.warn(`[ghl-signature-verify] Webhook from future: ${-age}ms ahead`);
      return { valid: false, error: "Webhook timestamp in future" };
    }
  } else {
    console.log("[ghl-signature-verify] No timestamp in payload, skipping replay protection");
  }

  try {
    const algo = usingGhlScheme
      ? ({ name: "Ed25519" } as const)
      : ({ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as const);
    const keyPem = usingGhlScheme ? GHL_ED25519_PUBLIC_KEY_PEM : GHL_PUBLIC_KEY_PEM;

    console.log(`[ghl-signature-verify] Importing ${algo.name} public key...`);
    const publicKey = await crypto.subtle.importKey(
      "spki",
      pemToArrayBuffer(keyPem),
      algo as AlgorithmIdentifier,
      false,
      ["verify"],
    );
    console.log("[ghl-signature-verify] Public key imported successfully");

    // Detect signature format and decode accordingly
    // (Ed25519 signatures are base64 per GHL docs; legacy may be base64 or hex)
    const sigFormat = detectSignatureFormat(signature);
    let signatureBuffer: ArrayBuffer;

    if (!usingGhlScheme && sigFormat === "hex") {
      console.log("[ghl-signature-verify] Decoding signature as hex");
      signatureBuffer = hexToArrayBuffer(signature);
    } else {
      console.log("[ghl-signature-verify] Decoding signature as base64");
      signatureBuffer = base64ToArrayBuffer(signature);
    }
    console.log(`[ghl-signature-verify] Decoded signature buffer length: ${signatureBuffer.byteLength} bytes`);

    // Encode the raw body as bytes
    const bodyBuffer = new TextEncoder().encode(rawBody);

    // Verify the signature
    const isValid = await crypto.subtle.verify(algo.name, publicKey, signatureBuffer, bodyBuffer);


    if (isValid) {
      console.log("[ghl-signature-verify] Signature verified successfully");
      return { valid: true };
    } else {
      console.warn("[ghl-signature-verify] Signature verification failed");
      return { valid: false, error: "Invalid signature" };
    }
  } catch (error) {
    console.error("[ghl-signature-verify] Verification error:", error);
    return { valid: false, error: `Verification error: ${error.message}` };
  }
}

/**
 * Helper to create a 401 Unauthorized response with CORS headers
 */
export function createUnauthorizedResponse(error: string, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "Unauthorized", details: error }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
