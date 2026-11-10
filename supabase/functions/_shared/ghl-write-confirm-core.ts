// Pure rules for confirming HighLevel writes requested by the AI.
// Flow: first call → server stores a pending confirmation and returns its id.
// The AI shows the summary; the user answers in a NEW chat message (new signed
// note, later iat). Only then may the same change run, once.

export const CONFIRMATION_TTL_S = 600;

export interface PendingConfirmation {
  user_id: string;
  installation_id: string;
  operation: string;
  params_hash: string;
  actor_iat: number;
  expires_at: string;
  consumed_at: string | null;
}

export type ConfirmCheck =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'wrong_user' | 'wrong_change' | 'expired' | 'used' | 'same_message' };

function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canonical((v as Record<string, unknown>)[k])]));
  }
  return v;
}

/** Fingerprint of the exact change (operation + params). */
export async function changeHash(operation: string, params: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical({ operation, params })));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Decide whether a stored confirmation lets this exact change run now. */
export function checkConfirmation(
  row: PendingConfirmation | null,
  req: { sub: string; inst: string; actorIat: number; operation: string; paramsHash: string; nowMs: number },
): ConfirmCheck {
  if (!row) return { ok: false, reason: 'not_found' };
  if (row.user_id !== req.sub || row.installation_id !== req.inst) return { ok: false, reason: 'wrong_user' };
  if (row.operation !== req.operation || row.params_hash !== req.paramsHash) return { ok: false, reason: 'wrong_change' };
  if (row.consumed_at) return { ok: false, reason: 'used' };
  if (Date.parse(row.expires_at) <= req.nowMs) return { ok: false, reason: 'expired' };
  // The user must have sent a new message after the proposal; the AI cannot
  // confirm on its own within the same turn.
  if (!(req.actorIat > row.actor_iat)) return { ok: false, reason: 'same_message' };
  return { ok: true };
}
