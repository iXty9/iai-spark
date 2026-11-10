// Rules for delivering a HighLevel notification summary to the user's chat.
// The recipient comes only from the verified actor note, never from the body.
import type { ActorClaims } from './ixty-actor.ts';

export const MAX_MESSAGE_CHARS = 4000;

export type DeliverPlan =
  | { ok: true; deliver: boolean; userId: string; message: string }
  | { ok: false; status: number; code: string };

export function planDelivery(claims: ActorClaims, body: unknown, shadowHeader: string | null): DeliverPlan {
  if (!claims.inst || !claims.loc) return { ok: false, status: 403, code: 'NOT_A_NOTIFICATION_ACTOR' };
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, status: 400, code: 'INVALID_BODY' };
  const raw = (body as Record<string, unknown>).message;
  if (typeof raw !== 'string') return { ok: false, status: 400, code: 'MESSAGE_REQUIRED' };
  const message = raw.trim();
  if (!message) return { ok: false, status: 400, code: 'MESSAGE_REQUIRED' };
  if (message.length > MAX_MESSAGE_CHARS) return { ok: false, status: 400, code: 'MESSAGE_TOO_LONG' };
  const shadow = shadowHeader === '1' || (body as Record<string, unknown>).shadow === true;
  return { ok: true, deliver: !shadow, userId: claims.sub, message };
}
