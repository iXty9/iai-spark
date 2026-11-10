// Confirmation gate shared by all ghl-* tool functions (I/O wrapper around
// ghl-write-confirm-core.ts). Writes run only if the user turned confirmations
// off, or confirmed this exact change in a later chat message.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { changeHash, checkConfirmation, CONFIRMATION_TTL_S } from './ghl-write-confirm-core.ts';

export type GateOutcome =
  | { run: true; confirmationId: string | null }
  | { run: false; code: 'CONFIRMATION_REQUIRED'; data: { confirmation_id: string; summary: string; risk: 'high' | 'normal'; expires_at: string } }
  | { run: false; code: 'CONFIRMATION_INVALID' | 'UPSTREAM_UNAVAILABLE'; data: null };

export async function gateWrite(
  supabase: SupabaseClient,
  change: { operation: string; params: unknown; summary: string; risk: 'high' | 'normal' },
  confirmationId: string | null,
  actor: { sub: string; inst: string; iat: number },
): Promise<GateOutcome> {
  const { operation, params, summary, risk } = change;
  const { data: profile, error: pErr } = await supabase
    .from('profiles').select('ghl_skip_write_confirmations').eq('id', actor.sub).maybeSingle();
  if (pErr) return { run: false, code: 'UPSTREAM_UNAVAILABLE', data: null };
  if (profile?.ghl_skip_write_confirmations === true) return { run: true, confirmationId: null };

  const paramsHash = await changeHash(operation, params);
  const nowIso = new Date().toISOString();
  const { data: pending, error: cErr } = await supabase
    .from('ghl_write_confirmations')
    .select('id, user_id, installation_id, operation, params_hash, actor_iat, expires_at, consumed_at')
    .eq('user_id', actor.sub).eq('installation_id', actor.inst).eq('operation', operation).eq('params_hash', paramsHash)
    .is('consumed_at', null).gt('expires_at', nowIso)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (cErr) return { run: false, code: 'UPSTREAM_UNAVAILABLE', data: null };
  if (confirmationId && pending?.id !== confirmationId) return { run: false, code: 'CONFIRMATION_INVALID', data: null };

  if (pending) {
    const check = checkConfirmation(pending, { sub: actor.sub, inst: actor.inst, actorIat: actor.iat, operation, paramsHash, nowMs: Date.now() });
    if (check.ok) {
      const { data: used } = await supabase.from('ghl_write_confirmations')
        .update({ consumed_at: nowIso }).eq('id', pending.id).is('consumed_at', null).select('id').maybeSingle();
      if (!used) return { run: false, code: 'CONFIRMATION_INVALID', data: null };
      return { run: true, confirmationId: pending.id };
    }
    return { run: false, code: 'CONFIRMATION_REQUIRED', data: { confirmation_id: pending.id, summary, risk, expires_at: pending.expires_at } };
  }

  const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_S * 1000).toISOString();
  const { data: created, error: iErr } = await supabase.from('ghl_write_confirmations').insert({
    user_id: actor.sub, installation_id: actor.inst, operation, params_hash: paramsHash,
    summary, actor_iat: actor.iat, expires_at: expiresAt,
  }).select('id').single();
  if (iErr || !created) return { run: false, code: 'UPSTREAM_UNAVAILABLE', data: null };
  return { run: false, code: 'CONFIRMATION_REQUIRED', data: { confirmation_id: created.id, summary, risk, expires_at: expiresAt } };
}
