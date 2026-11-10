// Short-lived signed "who is asking" note (actor assertion).
// Minted by chat-relay for a signed-in user, forwarded by n8n, verified by
// ghl-contacts. Identity comes only from these signed claims, never from
// caller-supplied body fields.

const enc = new TextEncoder();
const SIGNING_PREFIX = 'ixty-actor-v1.';
export const ACTOR_AUDIENCE = 'ixty-n8n';
export const ACTOR_TTL_S = 600;
export const ACTOR_HEADER = 'x-ixty-actor';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCATION_RE = /^[A-Za-z0-9]{1,64}$/;

export interface ActorClaims {
  v: 1;
  aud: string;
  sub: string; // Supabase user id
  inst: string | null; // ghl_installations.id
  loc: string | null; // HighLevel location id
  iat: number;
  exp: number;
  jti: string;
}

export type VerifyResult =
  | { ok: true; claims: ActorClaims }
  | { ok: false; reason: 'config' | 'malformed' | 'bad_signature' | 'expired' | 'not_yet_valid' | 'bad_claims' };

function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
  try {
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

export function secretUsable(secret: string | undefined | null): secret is string {
  return typeof secret === 'string' && secret.length >= 32;
}

export async function signActor(
  input: { sub: string; inst: string | null; loc: string | null },
  secret: string,
  nowS: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  if (!secretUsable(secret)) throw new Error('actor signing secret missing or too short');
  const claims: ActorClaims = {
    v: 1,
    aud: ACTOR_AUDIENCE,
    sub: input.sub,
    inst: input.inst,
    loc: input.loc,
    iat: nowS,
    exp: nowS + ACTOR_TTL_S,
    jti: crypto.randomUUID(),
  };
  const payload = b64urlEncode(enc.encode(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret, 'sign'), enc.encode(SIGNING_PREFIX + payload));
  return `${payload}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function verifyActor(
  token: string | null | undefined,
  secret: string | undefined | null,
  nowS: number = Math.floor(Date.now() / 1000),
): Promise<VerifyResult> {
  if (!secretUsable(secret)) return { ok: false, reason: 'config' };
  if (typeof token !== 'string' || token.length > 4096) return { ok: false, reason: 'malformed' };
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };
  const [payload, sigPart] = parts;
  const sig = b64urlDecode(sigPart);
  const body = b64urlDecode(payload);
  if (!sig || !body || sig.length !== 32) return { ok: false, reason: 'malformed' };

  // crypto.subtle.verify compares in constant time.
  const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret, 'verify'), sig as unknown as BufferSource, enc.encode(SIGNING_PREFIX + payload));
  if (!valid) return { ok: false, reason: 'bad_signature' };

  let c: any;
  try {
    c = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!c || typeof c !== 'object' || Array.isArray(c)) return { ok: false, reason: 'bad_claims' };
  const keys = Object.keys(c).sort().join(',');
  if (keys !== 'aud,exp,iat,inst,jti,loc,sub,v') return { ok: false, reason: 'bad_claims' };
  if (c.v !== 1 || c.aud !== ACTOR_AUDIENCE) return { ok: false, reason: 'bad_claims' };
  if (typeof c.sub !== 'string' || !UUID_RE.test(c.sub)) return { ok: false, reason: 'bad_claims' };
  if (c.inst !== null && (typeof c.inst !== 'string' || !UUID_RE.test(c.inst))) return { ok: false, reason: 'bad_claims' };
  if (c.loc !== null && (typeof c.loc !== 'string' || !LOCATION_RE.test(c.loc))) return { ok: false, reason: 'bad_claims' };
  if ((c.inst === null) !== (c.loc === null)) return { ok: false, reason: 'bad_claims' };
  if (typeof c.jti !== 'string' || !UUID_RE.test(c.jti)) return { ok: false, reason: 'bad_claims' };
  if (!Number.isInteger(c.iat) || !Number.isInteger(c.exp)) return { ok: false, reason: 'bad_claims' };
  if (c.exp - c.iat > ACTOR_TTL_S || c.exp <= c.iat) return { ok: false, reason: 'bad_claims' };
  if (c.iat > nowS + 30) return { ok: false, reason: 'not_yet_valid' };
  if (c.exp <= nowS) return { ok: false, reason: 'expired' };
  return { ok: true, claims: c as ActorClaims };
}
