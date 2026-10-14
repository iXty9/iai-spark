// Diagnostic only. Decoded HighLevel claims are UNVERIFIED metadata.
export interface InstallationRow { id: string; location_id: string | null; company_id: string | null; access_token_encrypted: string | null; }
export interface Deps {
  getUser: (authHeader: string) => Promise<{ userId: string | null; error: unknown }>;
  isAdmin: (userId: string) => Promise<{ data: unknown; error: unknown }>;
  fetchRow: (id: string) => Promise<{ data: InstallationRow | null; error: unknown }>;
  decrypt: (ciphertext: string) => Promise<string>;
  log: (event: string, fields?: Record<string, string | number | boolean | null>) => void;
  allowedOrigin: string;
}
const MAX_BODY_BYTES = 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GHL_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const CLASSES = new Set(['Location', 'Company', 'Agency', 'User']);
const MIN_EXP = 946684800, MAX_EXP = 4102444800;
const NOTE = 'Unverified decoded claims; not proof of validity, ownership, scope authorization or location activation.';

export function corsFor(origin: string) {
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Vary': 'Origin' };
}
export function j(status: number, body: unknown, origin: string): Response {
  return new Response(JSON.stringify(body), { status,
    headers: { ...corsFor(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

type Claims = Record<string, unknown>;
export function decodeClaims(token: string): { ok: true; claims: Claims } | { ok: false; reason: string } {
  if (typeof token !== 'string' || !token || token.length > 16384) return { ok: false, reason: 'token_unreadable' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'opaque_or_non_jwt' };
  const seg = parts[1];
  if (!/^[A-Za-z0-9_-]+$/.test(seg)) return { ok: false, reason: 'malformed_base64url' };
  let bytes: Uint8Array;
  try { const b64 = seg.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((seg.length + 3) % 4);
        bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); }
  catch { return { ok: false, reason: 'malformed_base64url' }; }
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return { ok: false, reason: 'invalid_utf8' }; }
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, reason: 'invalid_json' }; }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, reason: 'claims_not_object' };
  return { ok: true, claims: parsed as Claims };
}
const idOrNull = (v: unknown) => (typeof v === 'string' && GHL_ID_RE.test(v) ? v : null);
const cmp = (a: string | null, b: string | null) => (a === null || b === null ? null : a === b);

export function summarize(c: Claims, row: InstallationRow) {
  const authClass = typeof c.authClass === 'string' && CLASSES.has(c.authClass) ? c.authClass : null;
  const classId = idOrNull(c.authClassId);
  const coClaim = idOrNull(c.companyId);
  const tokenLoc = authClass === 'Location' ? classId : null;
  const tokenCo = coClaim ?? (authClass === 'Company' ? classId : null);
  const exp = typeof c.exp === 'number' && Number.isFinite(c.exp) && c.exp >= MIN_EXP && c.exp <= MAX_EXP
    ? new Date(c.exp * 1000).toISOString() : null;
  let scopeCount: number | null = null;
  const m = c.oauthMeta;
  if (m && typeof m === 'object' && !Array.isArray(m)) {
    const s = (m as Claims).scopes; if (Array.isArray(s) && s.length <= 1000) scopeCount = s.length;
  }
  return {
    auth_class: authClass,
    matches_location: authClass === null ? null : authClass === 'Location' ? cmp(tokenLoc, idOrNull(row.location_id)) : false,
    matches_company: cmp(tokenCo, idOrNull(row.company_id)),
    company_claim_present: coClaim !== null,
    scope_count: scopeCount,
    exp_utc: exp,
  };
}

export function createHandler(d: Deps) {
  const o = d.allowedOrigin;
  const unavailable = (ev: string) => { d.log(ev); return j(503, { error: 'service_unavailable' }, o); };
  return async (req: Request): Promise<Response> => {
    try {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...corsFor(o), 'Cache-Control': 'no-store' } });
      if (req.method !== 'POST') return j(405, { error: 'method_not_allowed' }, o);
      const auth = req.headers.get('Authorization') ?? '';
      if (!/^Bearer [A-Za-z0-9._-]+$/.test(auth)) return j(401, { error: 'unauthorized' }, o);

      let u; try { u = await d.getUser(auth); } catch { return unavailable('auth_lookup_failed'); }
      if (u.error || !u.userId) return j(401, { error: 'unauthorized' }, o);
      let r; try { r = await d.isAdmin(u.userId); } catch { return unavailable('role_lookup_failed'); }
      if (r.error) return unavailable('role_lookup_failed');
      if (r.data !== true) return j(403, { error: 'forbidden' }, o);

      if (Number(req.headers.get('content-length') ?? '0') > MAX_BODY_BYTES) return j(413, { error: 'payload_too_large' }, o);
      const raw = await req.text();
      if (raw.length > MAX_BODY_BYTES) return j(413, { error: 'payload_too_large' }, o);
      let body: unknown; try { body = JSON.parse(raw); } catch { return j(400, { error: 'invalid_input' }, o); }
      const ok = body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 1;
      const id = ok ? (body as Claims).installation_id : undefined;
      if (typeof id !== 'string' || !UUID_RE.test(id)) return j(400, { error: 'invalid_input' }, o);

      let row; try { row = await d.fetchRow(id); } catch { return unavailable('db_read_failed'); }
      if (row.error) return unavailable('db_read_failed');
      if (!row.data) return j(404, { error: 'not_found' }, o);
      const rec = row.data;
      if (!rec.access_token_encrypted) return j(200, { installation_id: rec.id, token_present: false, note: NOTE }, o);

      let token: string;
      try { token = await d.decrypt(rec.access_token_encrypted); }
      catch { d.log('decrypt_failed', { installation_id: rec.id });
              return j(200, { installation_id: rec.id, token_present: true, decode_status: 'decrypt_failed', note: NOTE }, o); }
      const dec = decodeClaims(token);
      if (!dec.ok) { d.log('decode_failed', { installation_id: rec.id, reason: dec.reason });
                     return j(200, { installation_id: rec.id, token_present: true, decode_status: dec.reason, note: NOTE }, o); }
      d.log('inspected', { installation_id: rec.id });
      return j(200, { installation_id: rec.id, token_present: true, decode_status: 'ok', ...summarize(dec.claims, rec), note: NOTE }, o);
    } catch { d.log('unhandled'); return j(500, { error: 'internal_error' }, o); }
  };
}
