import { assertEquals, assert } from 'jsr:@std/assert@1';
import { createHandler, decodeClaims, summarize, Deps } from './handler.ts';
import { decryptToken } from './crypto.ts';

const ID = '7a1087ef-bcae-4331-85dd-372197f1fd05', LOC = 'LOCsynthetic000001', CO = 'COsynthetic0000001';
const SENTINEL = 'SENTINELSECRETxyz';
const b64u = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (c: unknown) => `${b64u('{"alg":"none"}')}.${b64u(JSON.stringify(c))}.${SENTINEL}`;
const exp = 1893456000;

function mk(over: Partial<Deps> = {}, token = jwt({ authClass: 'Location', authClassId: LOC, companyId: CO, exp })) {
  const logs: string[] = []; const calls = { fetch: 0, decrypt: 0 };
  const d: Deps = {
    allowedOrigin: 'https://ixty.ai', log: (e, f) => logs.push(JSON.stringify({ e, ...f })),
    getUser: async () => ({ userId: 'u1', error: null }),
    isAdmin: async () => ({ data: true, error: null }),
    fetchRow: async (id) => { calls.fetch++; return { data: { id, location_id: LOC, company_id: CO, access_token_encrypted: 'CIPHER' + SENTINEL }, error: null }; },
    decrypt: async () => { calls.decrypt++; return token; }, ...over,
  };
  return { h: createHandler(d), logs, calls };
}
const post = (body: unknown = { installation_id: ID }, auth = 'Bearer abc.def.ghi') =>
  new Request('http://x', { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
async function run(m: ReturnType<typeof mk>, req = post()) {
  const res = await m.h(req); const text = await res.text();
  assertEquals(res.headers.get('Cache-Control'), 'no-store');
  assert(!text.includes(SENTINEL) && !m.logs.join().includes(SENTINEL), 'secret leaked');
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

// Auth / role / method
Deno.test('1 no auth header -> 401, no DB read', async () => { const m = mk(); const r = await run(m, post(undefined, '')); assertEquals(r.status, 401); assertEquals(m.calls.fetch, 0); });
Deno.test('2 non-admin -> 403, no DB read/decrypt', async () => { const m = mk({ isAdmin: async () => ({ data: false, error: null }) }); assertEquals((await run(m)).status, 403); assertEquals(m.calls, { fetch: 0, decrypt: 0 }); });
Deno.test('2b role data "true" string is not admin', async () => { const m = mk({ isAdmin: async () => ({ data: 'true', error: null }) }); assertEquals((await run(m)).status, 403); });
Deno.test('2c role data null is not admin', async () => { const m = mk({ isAdmin: async () => ({ data: null, error: null }) }); assertEquals((await run(m)).status, 403); });
Deno.test('2d role RPC error -> 503, no read', async () => { const m = mk({ isAdmin: async () => ({ data: true, error: { message: SENTINEL } }) }); assertEquals((await run(m)).status, 503); assertEquals(m.calls.fetch, 0); });
Deno.test('2e role RPC throws -> 503', async () => { const m = mk({ isAdmin: async () => { throw new Error(SENTINEL); } }); assertEquals((await run(m)).status, 503); });
Deno.test('2f getUser error -> 401', async () => { const m = mk({ getUser: async () => ({ userId: 'u1', error: { message: 'bad' } }) }); assertEquals((await run(m)).status, 401); });
Deno.test('2g getUser throws -> 503', async () => { const m = mk({ getUser: async () => { throw new Error(SENTINEL); } }); assertEquals((await run(m)).status, 503); });
Deno.test('8 anon/no user -> 401', async () => { const m = mk({ getUser: async () => ({ userId: null, error: null }) }); assertEquals((await run(m)).status, 401); });
Deno.test('GET -> 405', async () => { const m = mk(); assertEquals((await run(m, new Request('http://x', { method: 'GET' }))).status, 405); });
Deno.test('OPTIONS -> 204 with POST-only CORS', async () => { const res = await mk().h(new Request('http://x', { method: 'OPTIONS' })); await res.body?.cancel(); assertEquals(res.status, 204); assertEquals(res.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS'); });

// Input
Deno.test('3 non-UUID -> 400', async () => assertEquals((await run(mk(), post({ installation_id: 'abc' }))).status, 400));
Deno.test('3b extra keys -> 400', async () => assertEquals((await run(mk(), post({ installation_id: ID, x: 1 }))).status, 400));
Deno.test('3c invalid JSON -> 400', async () => assertEquals((await run(mk(), post('{bad'))).status, 400));
Deno.test('3d oversized body -> 413', async () => assertEquals((await run(mk(), post('x'.repeat(2000)))).status, 413));

// DB
Deno.test('4 unknown id -> 404', async () => assertEquals((await run(mk({ fetchRow: async () => ({ data: null, error: null }) }))).status, 404));
Deno.test('4b DB error -> 503 not 404', async () => assertEquals((await run(mk({ fetchRow: async () => ({ data: null, error: { message: SENTINEL } }) }))).status, 503));
Deno.test('4c DB throws -> 503', async () => assertEquals((await run(mk({ fetchRow: async () => { throw new Error(SENTINEL); } }))).status, 503));

// Classes and comparisons
Deno.test('5 Location token matches', async () => { const b = (await run(mk())).body; assertEquals([b.auth_class, b.matches_location, b.matches_company], ['Location', true, true]); });
Deno.test('6 Company token', async () => { const b = (await run(mk({}, jwt({ authClass: 'Company', authClassId: CO, exp })))).body; assertEquals([b.auth_class, b.matches_location, b.matches_company], ['Company', false, true]); });
Deno.test('Location token without companyId -> company null, not mismatch', async () => { const b = (await run(mk({}, jwt({ authClass: 'Location', authClassId: LOC, exp })))).body; assertEquals([b.matches_location, b.matches_company, b.company_claim_present], [true, null, false]); });
Deno.test('wrong location -> false', async () => assertEquals((await run(mk({}, jwt({ authClass: 'Location', authClassId: 'OTHERloc', companyId: CO, exp })))).body.matches_location, false));
Deno.test('wrong company -> false', async () => assertEquals((await run(mk({}, jwt({ authClass: 'Location', authClassId: LOC, companyId: 'OTHERco', exp })))).body.matches_company, false));
Deno.test('unknown class -> nulls', async () => { const b = (await run(mk({}, jwt({ authClass: 'Weird', authClassId: LOC, exp })))).body; assertEquals([b.auth_class, b.matches_location, b.matches_company], [null, null, null]); });
Deno.test('row company null -> null', () => assertEquals(summarize({ authClass: 'Company', authClassId: CO }, { id: ID, location_id: LOC, company_id: null, access_token_encrypted: 'x' }).matches_company, null));

// Malformed tokens / claims / expiry
for (const [name, tok, reason] of [
  ['opaque', 'opaqueTokenNoDots', 'opaque_or_non_jwt'],
  ['bad b64url', 'a.@@@.c', 'malformed_base64url'],
  ['invalid utf8', `a.${b64u('\xff\xfe')}.c`, 'invalid_utf8'],
  ['invalid json', `a.${b64u('{nope')}.c`, 'invalid_json'],
  ['null claims', `a.${b64u('null')}.c`, 'claims_not_object'],
  ['array claims', `a.${b64u('[1]')}.c`, 'claims_not_object'],
  ['empty', '', 'token_unreadable'],
] as const) Deno.test(`decode ${name}`, async () => { const r = await run(mk({}, tok)); assertEquals(r.status, 200); assertEquals(r.body.decode_status, reason); assertEquals(r.body.auth_class, undefined); });
Deno.test('exp missing/string/out of range -> null', () => { for (const e of [undefined, '123', 1, 9e12, NaN]) assertEquals(summarize({ authClass: 'Location', exp: e }, { id: ID, location_id: LOC, company_id: CO, access_token_encrypted: 'x' }).exp_utc, null); });
Deno.test('scopes non-array -> null', () => assertEquals(summarize({ oauthMeta: { scopes: 'a b' } }, { id: ID, location_id: null, company_id: null, access_token_encrypted: 'x' }).scope_count, null));
Deno.test('oversized id claim -> null', () => assertEquals(summarize({ authClass: 'Location', authClassId: 'x'.repeat(100) }, { id: ID, location_id: LOC, company_id: CO, access_token_encrypted: 'x' }).matches_location, null));
Deno.test('decodeClaims never throws on garbage', () => { for (const t of ['..', 'a.b', 'a.b.c.d', '.\u0000.']) decodeClaims(t); });

// Decryption
Deno.test('decrypt throws -> decrypt_failed, sanitized', async () => assertEquals((await run(mk({ decrypt: async () => { throw new Error(SENTINEL); } }))).body.decode_status, 'decrypt_failed'));
Deno.test('real decryptToken rejects short/garbage ciphertext', async () => { for (const c of ['', 'AAAA', 'not-base64!']) { let threw = false; try { await decryptToken(c, 'k'); } catch { threw = true; } assert(threw); } });
Deno.test('no token stored -> token_present false, no decrypt', async () => { const m = mk({ fetchRow: async (id) => ({ data: { id, location_id: LOC, company_id: CO, access_token_encrypted: null }, error: null }) }); assertEquals((await run(m)).body.token_present, false); assertEquals(m.calls.decrypt, 0); });

// 7 secrets: enforced in run() for every test (body + logs never contain SENTINEL)
Deno.test('7 note labels output as unverified', async () => assert((await run(mk())).body.note.startsWith('Unverified')));
