import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildGhlRequest, normalizeResponse, parseCommand } from './ghl-contacts-core.ts';

const LOC = 'YZQCL96jxM5knY233VD4';

Deno.test('unknown operations and extra fields are refused', () => {
  assertEquals(parseCommand({ operation: 'contacts.merge', params: { contact_id: 'abc' } }), null);
  assertEquals(parseCommand({ operation: 'users.list', params: {} }), null);
  assertEquals(parseCommand({ operation: 'contacts.search', params: { query: 'Joshua' }, user_id: 'x' }), null);
  assert(parseCommand({ operation: 'contacts.search', params: { query: 'Joshua' } }));
  assert(parseCommand({ operation: 'contacts.get', params: { contact_id: 'abc123' } }));
});

Deno.test('caller cannot choose the sub-account', () => {
  assertEquals(parseCommand({ operation: 'contacts.search', params: { query: 'a', locationId: 'OTHER' } }), null);
  const cmd = parseCommand({ operation: 'contacts.search', params: { query: 'Joshua' } })!;
  assertEquals(buildGhlRequest(cmd, LOC).body?.locationId, LOC);
});

Deno.test('search query limited to 75 characters, page size 1-50', () => {
  assertEquals(parseCommand({ operation: 'contacts.search', params: { query: 'x'.repeat(76) } }), null);
  assertEquals(parseCommand({ operation: 'contacts.search', params: { query: 'a', pageLimit: 51 } }), null);
  assertEquals(parseCommand({ operation: 'contacts.search', params: { query: 'a', pageLimit: 0 } }), null);
  const ok = parseCommand({ operation: 'contacts.search', params: { query: 'a' } })!;
  assertEquals(ok.params, { query: 'a', page: 1, pageLimit: 20 });
});

Deno.test('contact id cannot change the request path', () => {
  assertEquals(parseCommand({ operation: 'contacts.get', params: { contact_id: '../users' } }), null);
  assertEquals(parseCommand({ operation: 'contacts.get', params: { contact_id: 'abc?x=1' } }), null);
});

Deno.test('contacts from another sub-account are refused', () => {
  const cmd = parseCommand({ operation: 'contacts.search', params: { query: 'a' } })!;
  const r = normalizeResponse(200, { contacts: [{ id: 'c1', locationId: 'OTHER' }], total: 1 }, cmd, LOC, 'r1');
  assertEquals(r.error?.code, 'TENANT_MISMATCH');
  const get = parseCommand({ operation: 'contacts.get', params: { contact_id: 'c1' } })!;
  assertEquals(normalizeResponse(200, { contact: { id: 'c1', locationId: 'OTHER' } }, get, LOC, 'r2').error?.code, 'TENANT_MISMATCH');
});

Deno.test('own sub-account contacts are returned with allowlisted fields only', () => {
  const cmd = parseCommand({ operation: 'contacts.search', params: { query: 'a', pageLimit: 5 } })!;
  const r = normalizeResponse(200, { contacts: [{ id: 'c1', locationId: LOC, firstName: 'Jo', customFields: [1] }], total: 1 }, cmd, LOC, 'r1');
  assert(r.ok);
  const data = r.data as any;
  assertEquals(data.contacts[0], { id: 'c1', locationId: LOC, firstName: 'Jo' });
  assertEquals(data.has_more, false);
});

Deno.test('get must return the requested contact', () => {
  const get = parseCommand({ operation: 'contacts.get', params: { contact_id: 'c1' } })!;
  assertEquals(normalizeResponse(200, { contact: { id: 'c2', locationId: LOC } }, get, LOC, 'r').error?.code, 'INVALID_RESPONSE');
});
