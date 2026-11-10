// Shared HighLevel token manager. Every refresh path (cron, manual, proxy)
// goes through refreshInstallation() so only one refresh runs at a time.

const TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';
const LEASE_MS = 60_000;

export async function decryptToken(encryptedData: string, key: string): Promise<string> {
  const keyData = new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']);
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: combined.slice(0, 12) }, cryptoKey, combined.slice(12));
  return new TextDecoder().decode(decrypted);
}

export async function encryptToken(token: string, key: string): Promise<string> {
  const keyData = new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, new TextEncoder().encode(token));
  const combined = new Uint8Array(12 + enc.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(enc), 12);
  return btoa(String.fromCharCode(...combined));
}

/** user_type to send on refresh, by stored token class. */
export function userTypeForClass(tokenClass: string | null | undefined): 'Location' | 'Company' {
  return tokenClass === 'company_parent' ? 'Company' : 'Location';
}

export type RefreshOutcome =
  | { ok: true; accessToken: string; expiresAt: string; refreshed: boolean }
  | { ok: false; reason: 'busy' | 'provider_rejected' | 'bad_response' | 'store_failed' | 'config'; detail: string };

/** Validate a refresh response. Fails closed. */
export function validateRefreshResponse(body: any, previousRefreshToken: string): string | null {
  if (!body || typeof body !== 'object') return 'response is not an object';
  if (typeof body.access_token !== 'string' || !body.access_token) return 'missing access_token';
  if (typeof body.refresh_token !== 'string' || !body.refresh_token) return 'missing refresh_token';
  if (body.refresh_token === previousRefreshToken) return 'refresh token was not rotated';
  if (typeof body.expires_in !== 'number' || body.expires_in <= 0) return 'invalid expires_in';
  return null;
}

interface Env { clientId: string; clientSecret: string; encryptionKey: string }

export function readEnv(): Env | null {
  const clientId = Deno.env.get('GHL_CLIENT_ID');
  const clientSecret = Deno.env.get('GHL_CLIENT_SECRET');
  const encryptionKey = Deno.env.get('GHL_TOKEN_ENCRYPTION_KEY');
  if (!clientId || !clientSecret || !encryptionKey) return null;
  return { clientId, clientSecret, encryptionKey };
}

/**
 * Return a valid access token, refreshing under a single-writer lease if it
 * expires within `skewMs`. A concurrent caller gets reason 'busy' (or the
 * fresh token if the other refresh already finished).
 */
export async function getValidAccessToken(
  supabase: any,
  installationId: string,
  opts: { skewMs?: number; force?: boolean; source: string } = { source: 'unknown' },
  fetchImpl: typeof fetch = fetch,
): Promise<RefreshOutcome> {
  const env = readEnv();
  if (!env) return { ok: false, reason: 'config', detail: 'missing HighLevel configuration' };
  const skew = opts.skewMs ?? 5 * 60_000;

  const { data: inst, error } = await supabase
    .from('ghl_installations').select('*').eq('id', installationId).maybeSingle();
  if (error || !inst) return { ok: false, reason: 'store_failed', detail: 'installation not found' };

  const expiresAt = inst.token_expires_at ? new Date(inst.token_expires_at).getTime() : 0;
  if (!opts.force && expiresAt > Date.now() + skew) {
    return { ok: true, accessToken: await decryptToken(inst.access_token_encrypted, env.encryptionKey), expiresAt: inst.token_expires_at, refreshed: false };
  }

  // Claim lease: only succeeds if no live lease and generation unchanged.
  const nowIso = new Date().toISOString();
  const { data: claimed } = await supabase
    .from('ghl_installations')
    .update({ refresh_lease_until: new Date(Date.now() + LEASE_MS).toISOString() })
    .eq('id', inst.id)
    .eq('token_generation', inst.token_generation ?? 0)
    .or(`refresh_lease_until.is.null,refresh_lease_until.lt.${nowIso}`)
    .select('id');
  if (!claimed || claimed.length === 0) {
    // Someone else is refreshing; if they already finished, use their token.
    const { data: again } = await supabase.from('ghl_installations').select('*').eq('id', inst.id).maybeSingle();
    if (again && again.token_generation !== inst.token_generation && new Date(again.token_expires_at).getTime() > Date.now() + 60_000) {
      return { ok: true, accessToken: await decryptToken(again.access_token_encrypted, env.encryptionKey), expiresAt: again.token_expires_at, refreshed: false };
    }
    return { ok: false, reason: 'busy', detail: 'another refresh is in progress' };
  }

  const release = (extra: Record<string, unknown> = {}) =>
    supabase.from('ghl_installations').update({ refresh_lease_until: null, ...extra }).eq('id', inst.id);

  const refreshToken = await decryptToken(inst.refresh_token_encrypted, env.encryptionKey);
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    redirect: 'error',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      user_type: userTypeForClass(inst.token_class),
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[ghl-token-manager] ${opts.source} refresh rejected [${res.status}] for ${inst.location_id}`);
    await release({ connection_status: 'error', refresh_error: `${opts.source} refresh failed [${res.status}]: ${text.slice(0, 500)}` });
    return { ok: false, reason: 'provider_rejected', detail: `[${res.status}] ${text.slice(0, 500)}` };
  }
  let body: any;
  try { body = JSON.parse(text); } catch { body = null; }
  const invalid = validateRefreshResponse(body, refreshToken);
  if (invalid) {
    await release({ refresh_error: `${opts.source} refresh response invalid: ${invalid}` });
    return { ok: false, reason: 'bad_response', detail: invalid };
  }

  const newExpires = new Date(Date.now() + body.expires_in * 1000).toISOString();
  const { error: saveErr } = await release({
    access_token_encrypted: await encryptToken(body.access_token, env.encryptionKey),
    refresh_token_encrypted: await encryptToken(body.refresh_token, env.encryptionKey),
    token_expires_at: newExpires,
    last_refresh_at: new Date().toISOString(),
    connection_status: 'connected',
    refresh_error: null,
    token_generation: (inst.token_generation ?? 0) + 1,
    ...(typeof body.scope === 'string' ? { scopes: body.scope } : {}),
  });
  if (saveErr) {
    console.error('[ghl-token-manager] CRITICAL: refreshed but failed to save', saveErr.message);
    return { ok: false, reason: 'store_failed', detail: saveErr.message };
  }
  console.log(`[ghl-token-manager] ${opts.source} refreshed ${inst.location_id} (${inst.token_class ?? 'unknown'})`);
  return { ok: true, accessToken: body.access_token, expiresAt: newExpires, refreshed: true };
}
