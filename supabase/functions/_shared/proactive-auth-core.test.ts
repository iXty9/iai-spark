import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { decideProactiveAccess, safeEqual } from './proactive-auth-core.ts';

const U = '5519f7f8-2619-43a1-99d7-bb1d1cc1d0d2';
const OTHER = '00000000-0000-4000-8000-000000000000';
const base = { lockEnabled: true, serverAuth: false, isAdmin: false, actorSub: null, body: { user_id: U } };

Deno.test('locked: no note and no password is refused', () => {
  assertEquals(decideProactiveAccess(base), { ok: false, status: 401, code: 'UNAUTHORIZED' });
});
Deno.test('forged note (verifies to null) is refused', () => {
  assertEquals(decideProactiveAccess({ ...base, actorSub: null }).ok, false);
});
Deno.test('valid note for another user is refused', () => {
  assertEquals(decideProactiveAccess({ ...base, actorSub: U, body: { user_id: OTHER } }), { ok: false, status: 403, code: 'ACTOR_WRONG_USER' });
});
Deno.test('valid note cannot broadcast or look up usernames', () => {
  assertEquals(decideProactiveAccess({ ...base, actorSub: U, body: { broadcast_all: true } }).ok, false);
  assertEquals(decideProactiveAccess({ ...base, actorSub: U, body: { username: 'x' } }).ok, false);
});
Deno.test('valid note forces recipient to its user', () => {
  assertEquals(decideProactiveAccess({ ...base, actorSub: U, body: {} }), { ok: true, mode: 'actor', forcedUserId: U });
});
Deno.test('server password or admin is trusted', () => {
  assertEquals(decideProactiveAccess({ ...base, serverAuth: true, body: { broadcast_all: true } }).ok, true);
  assertEquals(decideProactiveAccess({ ...base, isAdmin: true }).ok, true);
});
Deno.test('lock off keeps old behaviour', () => {
  assertEquals(decideProactiveAccess({ ...base, lockEnabled: false }).ok, true);
});
Deno.test('safeEqual', () => {
  assertEquals(safeEqual('abc', 'abc'), true);
  assertEquals(safeEqual('abc', 'abd'), false);
  assertEquals(safeEqual('', ''), false);
  assertEquals(safeEqual(null, 'a'), false);
});
