import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { planDelivery } from './ghl-notification-deliver-core.ts';

const claims = { v: 1 as const, aud: 'ixty-n8n', sub: '5519f7f8-2619-43a1-99d7-bb1d1cc1d0d2', inst: '8813a31c-f2ab-4d6a-aa40-5d4defdf6130', loc: 'YZQCL96jxM5knY233VD4', iat: 1, exp: 2, jti: 'x' };

Deno.test('delivers to the signed user, ignoring any user_id in the body', () => {
  const p = planDelivery(claims, { message: 'New contact', user_id: '00000000-0000-0000-0000-000000000000' }, null);
  assertEquals(p, { ok: true, deliver: true, userId: claims.sub, message: 'New contact' });
});
Deno.test('trial copy is checked but never delivered', () => {
  const p = planDelivery(claims, { message: 'hi' }, '1');
  assertEquals(p.ok && p.deliver, false);
});
Deno.test('chat-style note without an installation is refused', () => {
  assertEquals(planDelivery({ ...claims, inst: null, loc: null }, { message: 'hi' }, null), { ok: false, status: 403, code: 'NOT_A_NOTIFICATION_ACTOR' });
});
Deno.test('empty or oversized messages are refused', () => {
  assertEquals(planDelivery(claims, { message: '  ' }, null).ok, false);
  assertEquals(planDelivery(claims, { message: 'a'.repeat(4001) }, null).ok, false);
});
