// Who may post a message into a user's chat (proactive-message-webhook).
// Pure rules; the entrypoint gathers the facts and applies the decision.

export interface ProactiveAuthFacts {
  /** Lock switch from app_settings (proactive_post_lock_enabled). */
  lockEnabled: boolean;
  /** Caller presented the server-only post password or the service-role key. */
  serverAuth: boolean;
  /** Caller is a signed-in admin (verified JWT + admin role). */
  isAdmin: boolean;
  /** Verified signed actor note's user id, if a valid note was presented. */
  actorSub: string | null;
  body: { user_id?: string; username?: string; broadcast_all?: boolean };
}

export type ProactiveAuthDecision =
  | { ok: true; mode: 'trusted' }
  | { ok: true; mode: 'actor'; forcedUserId: string }
  | { ok: false; status: 401 | 403; code: string };

export function decideProactiveAccess(f: ProactiveAuthFacts): ProactiveAuthDecision {
  if (f.serverAuth || f.isAdmin) return { ok: true, mode: 'trusted' };
  if (f.actorSub) {
    // A signed note can only message its own user: no broadcast, no username lookup,
    // and any body user_id must match.
    if (f.body.broadcast_all === true || f.body.username) return { ok: false, status: 403, code: 'ACTOR_SCOPE' };
    if (f.body.user_id && f.body.user_id !== f.actorSub) return { ok: false, status: 403, code: 'ACTOR_WRONG_USER' };
    return { ok: true, mode: 'actor', forcedUserId: f.actorSub };
  }
  if (!f.lockEnabled) return { ok: true, mode: 'trusted' };
  return { ok: false, status: 401, code: 'UNAUTHORIZED' };
}

/** Constant-time string compare. */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length === 0 || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
