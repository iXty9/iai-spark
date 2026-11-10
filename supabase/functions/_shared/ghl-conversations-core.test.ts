import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildGhlRequest, describeWrite, isWrite, normalizeResponse, ownershipCheck, parseCommand, parseRequest } from './ghl-conversations-core.ts';

const LOC = 'YZQCL96jxM5knY233VD4';

Deno.test('sending and deleting are writes; search is a read', () => {
  assert(isWrite('conversations.messages.send'));
  assert(isWrite('conversations.delete'));
  assertEquals(isWrite('conversations.search'), false);
});

Deno.test('search always uses the server sub-account', () => {
  assertEquals(parseCommand({ operation: 'conversations.search', params: { locationId: 'OTHER' } }), null);
  const cmd = parseCommand({ operation: 'conversations.search', params: { contact_id: 'c1' } })!;
  assert(buildGhlRequest(cmd, LOC).path.includes(`locationId=${LOC}`));
});

Deno.test('ids cannot change the request path or query', () => {
  assertEquals(parseCommand({ operation: 'conversations.get', params: { conversation_id: '../x' } }), null);
  assertEquals(parseCommand({ operation: 'conversations.messages.list', params: { conversation_id: 'a?b=1' } }), null);
});

Deno.test('send needs a known channel, non-empty text, and a subject only for email', () => {
  assertEquals(parseCommand({ operation: 'conversations.messages.send', params: { contact_id: 'c1', type: 'Fax', message: 'hi' } }), null);
  assertEquals(parseCommand({ operation: 'conversations.messages.send', params: { contact_id: 'c1', type: 'SMS', message: ' ' } }), null);
  assertEquals(parseCommand({ operation: 'conversations.messages.send', params: { contact_id: 'c1', type: 'SMS', message: 'hi', subject: 's' } }), null);
  assertEquals(parseCommand({ operation: 'conversations.messages.send', params: { contact_id: 'c1', type: 'Email', message: 'hi' } }), null);
  assert(parseCommand({ operation: 'conversations.messages.send', params: { contact_id: 'c1', type: 'Email', message: 'hi', subject: 'Hello' } }));
});

Deno.test('send, create, update, delete and message history verify ownership first', () => {
  const send = parseCommand({ operation: 'conversations.messages.send', params: { contact_id: 'c1', type: 'SMS', message: 'hi' } })!;
  assertEquals(ownershipCheck(send), { kind: 'contact', id: 'c1' });
  const del = parseCommand({ operation: 'conversations.delete', params: { conversation_id: 'v1' } })!;
  assertEquals(ownershipCheck(del), { kind: 'conversation', id: 'v1' });
  const list = parseCommand({ operation: 'conversations.messages.list', params: { conversation_id: 'v1' } })!;
  assertEquals(ownershipCheck(list), { kind: 'conversation', id: 'v1' });
});

Deno.test('send summary shows recipient, channel and full text', () => {
  const send = parseCommand({ operation: 'conversations.messages.send', params: { contact_id: 'c1', type: 'SMS', message: 'See you at 3pm' } })!;
  const s = describeWrite(send, 'Joshua (+14055550100)');
  assert(s.includes('SEND SMS') && s.includes('Joshua (+14055550100)') && s.includes('See you at 3pm'));
});

Deno.test('conversations from another sub-account are refused', () => {
  const cmd = parseCommand({ operation: 'conversations.search', params: {} })!;
  const r = normalizeResponse(200, { conversations: [{ id: 'v1', locationId: 'OTHER' }] }, cmd, LOC);
  assertEquals(r.ok ? null : r.code, 'TENANT_MISMATCH');
});

Deno.test('confirmation_id on a read is refused', () => {
  assertEquals(parseRequest({ operation: 'conversations.get', params: { conversation_id: 'v1' }, confirmation_id: crypto.randomUUID() }), null);
});
