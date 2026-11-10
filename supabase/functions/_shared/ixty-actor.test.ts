import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTOR_TTL_S, signActor, verifyActor } from './ixty-actor.ts';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const USER = '5519f7f8-2619-43a1-99d7-bb1d1cc1d0d2';
const INST = '8813a31c-f2ab-4d6a-aa40-5d4defdf6130';
const LOC = 'YZQCL96jxM5knY233VD4';
const NOW = 1_800_000_000;

Deno.test('signed note verifies and carries the server-chosen user and sub-account', async () => {
  const t = await signActor({ sub: USER, inst: INST, loc: LOC }, SECRET, NOW);
  const r = await verifyActor(t, SECRET, NOW + 5);
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.claims.sub, USER);
    assertEquals(r.claims.loc, LOC);
  }
});

Deno.test('unsigned or tampered note is denied', async () => {
  const t = await signActor({ sub: USER, inst: INST, loc: LOC }, SECRET, NOW);
  const [payload, sig] = t.split('.');
  const forged = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  forged.sub = '00000000-0000-4000-8000-000000000000';
  const forgedPayload = btoa(JSON.stringify(forged)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assertEquals((await verifyActor(`${forgedPayload}.${sig}`, SECRET, NOW)).ok, false);
  assertEquals((await verifyActor(payload, SECRET, NOW)).ok, false);
  assertEquals((await verifyActor(undefined, SECRET, NOW)).ok, false);
});

Deno.test('note signed with a different secret is denied', async () => {
  const t = await signActor({ sub: USER, inst: INST, loc: LOC }, 'another-secret-that-is-32-chars-long!!', NOW);
  const r = await verifyActor(t, SECRET, NOW);
  assertEquals(r.ok ? 'ok' : r.reason, 'bad_signature');
});

Deno.test('note expires after 10 minutes', async () => {
  assertEquals(ACTOR_TTL_S, 600);
  const t = await signActor({ sub: USER, inst: INST, loc: LOC }, SECRET, NOW);
  assert((await verifyActor(t, SECRET, NOW + 599)).ok);
  const r = await verifyActor(t, SECRET, NOW + 600);
  assertEquals(r.ok ? 'ok' : r.reason, 'expired');
});

Deno.test('missing or short secret fails closed', async () => {
  const t = await signActor({ sub: USER, inst: INST, loc: LOC }, SECRET, NOW);
  const r = await verifyActor(t, 'short', NOW);
  assertEquals(r.ok ? 'ok' : r.reason, 'config');
});
