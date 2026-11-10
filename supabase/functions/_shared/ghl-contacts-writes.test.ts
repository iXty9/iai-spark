import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildGhlRequest, describeWrite, isWrite, normalizeResponse, parseCommand, parseRequest } from './ghl-contacts-core.ts';
import { changeHash, checkConfirmation, type PendingConfirmation } from './ghl-write-confirm-core.ts';

const LOC = 'YZQCL96jxM5knY233VD4';
const SUB = '5519f7f8-2619-43a1-99d7-bb1d1cc1d0d2';
const INST = '8813a31c-f2ab-4d6a-aa40-5d4defdf6130';

Deno.test('writes are classified as writes, reads are not', () => {
  for (const op of ['contacts.create', 'contacts.update', 'contacts.delete', 'contacts.tags.add', 'contacts.tasks.delete'] as const) assert(isWrite(op));
  for (const op of ['contacts.search', 'contacts.get', 'contacts.tasks.list', 'contacts.tasks.get'] as const) assertEquals(isWrite(op), false);
});

Deno.test('create always uses the server sub-account, caller cannot pass locationId', () => {
  assertEquals(parseCommand({ operation: 'contacts.create', params: { firstName: 'Jo', locationId: 'OTHER' } }), null);
  const cmd = parseCommand({ operation: 'contacts.create', params: { firstName: 'Jo', email: 'jo@example.com' } })!;
  assertEquals(buildGhlRequest(cmd, LOC), { method: 'POST', path: '/contacts/', body: { firstName: 'Jo', email: 'jo@example.com', locationId: LOC } });
});

Deno.test('create needs at least a name, email or phone; upsert needs email or phone', () => {
  assertEquals(parseCommand({ operation: 'contacts.create', params: { companyName: 'Acme' } }), null);
  assertEquals(parseCommand({ operation: 'contacts.upsert', params: { firstName: 'Jo' } }), null);
  assert(parseCommand({ operation: 'contacts.upsert', params: { phone: '+1 405 555 0100' } }));
});

Deno.test('bad email, phone and oversized fields are refused', () => {
  assertEquals(parseCommand({ operation: 'contacts.create', params: { email: 'not-an-email' } }), null);
  assertEquals(parseCommand({ operation: 'contacts.create', params: { phone: 'call me' } }), null);
  assertEquals(parseCommand({ operation: 'contacts.create', params: { firstName: 'x'.repeat(101) } }), null);
  assertEquals(parseCommand({ operation: 'contacts.tags.add', params: { contact_id: 'c1', tags: Array(21).fill(0).map((_, i) => `t${i}`) } }), null);
});

Deno.test('update sends only changed fields to PUT /contacts/{id}', () => {
  assertEquals(parseCommand({ operation: 'contacts.update', params: { contact_id: 'c1' } }), null);
  const cmd = parseCommand({ operation: 'contacts.update', params: { contact_id: 'c1', lastName: 'Lee' } })!;
  assertEquals(buildGhlRequest(cmd, LOC), { method: 'PUT', path: '/contacts/c1', body: { lastName: 'Lee' } });
});

Deno.test('ids in task and tag paths cannot change the request path', () => {
  assertEquals(parseCommand({ operation: 'contacts.tasks.delete', params: { contact_id: 'c1', task_id: '../x' } }), null);
  assertEquals(parseCommand({ operation: 'contacts.tags.remove', params: { contact_id: 'c1/../', tags: ['a'] } }), null);
  const cmd = parseCommand({ operation: 'contacts.tasks.complete', params: { contact_id: 'c1', task_id: 't1' } })!;
  assertEquals(buildGhlRequest(cmd, LOC), { method: 'PUT', path: '/contacts/c1/tasks/t1/completed', body: { completed: true } });
});

Deno.test('task create needs a title and a real ISO due date', () => {
  assertEquals(parseCommand({ operation: 'contacts.tasks.create', params: { contact_id: 'c1', title: 'Call', dueDate: 'tomorrow' } }), null);
  const cmd = parseCommand({ operation: 'contacts.tasks.create', params: { contact_id: 'c1', title: 'Call', dueDate: '2026-11-12T15:00:00Z' } })!;
  assertEquals(buildGhlRequest(cmd, LOC).body, { completed: false, title: 'Call', dueDate: '2026-11-12T15:00:00Z' });
});

Deno.test('confirmation_id is only accepted on writes and must be a UUID', () => {
  assertEquals(parseRequest({ operation: 'contacts.get', params: { contact_id: 'c1' }, confirmation_id: crypto.randomUUID() }), null);
  assertEquals(parseRequest({ operation: 'contacts.delete', params: { contact_id: 'c1' }, confirmation_id: 'yes' }), null);
  assert(parseRequest({ operation: 'contacts.delete', params: { contact_id: 'c1' }, confirmation_id: crypto.randomUUID() }));
});

Deno.test('write results from another sub-account are refused', () => {
  const cmd = parseCommand({ operation: 'contacts.create', params: { firstName: 'Jo' } })!;
  assertEquals(normalizeResponse(201, { contact: { id: 'c9', locationId: 'OTHER' } }, cmd, LOC, 'r').error?.code, 'TENANT_MISMATCH');
  assert(normalizeResponse(201, { contact: { id: 'c9', locationId: LOC, firstName: 'Jo' } }, cmd, LOC, 'r').ok);
});

Deno.test('a task belonging to a different contact is refused', () => {
  const cmd = parseCommand({ operation: 'contacts.tasks.get', params: { contact_id: 'c1', task_id: 't1' } })!;
  assertEquals(normalizeResponse(200, { task: { id: 't1', contactId: 'c2' } }, cmd, LOC, 'r').error?.code, 'INVALID_RESPONSE');
});

Deno.test('deletes are described as permanent', () => {
  const cmd = parseCommand({ operation: 'contacts.delete', params: { contact_id: 'c1' } })!;
  assert(describeWrite(cmd).includes('PERMANENTLY DELETE'));
});

const row = (o: Partial<PendingConfirmation> = {}): PendingConfirmation => ({
  user_id: SUB, installation_id: INST, operation: 'contacts.delete', params_hash: 'h', actor_iat: 1000,
  expires_at: new Date(2_000_000).toISOString(), consumed_at: null, ...o,
});
const req = (o: Record<string, unknown> = {}) => ({ sub: SUB, inst: INST, actorIat: 1100, operation: 'contacts.delete', paramsHash: 'h', nowMs: 1_500_000, ...o });

Deno.test('confirmation runs only after a later user message', () => {
  assert(checkConfirmation(row(), req()).ok);
  assertEquals(checkConfirmation(row(), req({ actorIat: 1000 })), { ok: false, reason: 'same_message' });
});

Deno.test('confirmation is single use, expires, and is bound to the user and exact change', () => {
  assertEquals(checkConfirmation(row({ consumed_at: 'x' }), req()), { ok: false, reason: 'used' });
  assertEquals(checkConfirmation(row(), req({ nowMs: 3_000_000 })), { ok: false, reason: 'expired' });
  assertEquals(checkConfirmation(row(), req({ sub: crypto.randomUUID() })), { ok: false, reason: 'wrong_user' });
  assertEquals(checkConfirmation(row(), req({ paramsHash: 'other' })), { ok: false, reason: 'wrong_change' });
  assertEquals(checkConfirmation(null, req()), { ok: false, reason: 'not_found' });
});

Deno.test('change fingerprint ignores key order but not values', async () => {
  assertEquals(await changeHash('x', { a: 1, b: 2 }), await changeHash('x', { b: 2, a: 1 }));
  assert((await changeHash('x', { a: 1 })) !== (await changeHash('x', { a: 2 })));
});
