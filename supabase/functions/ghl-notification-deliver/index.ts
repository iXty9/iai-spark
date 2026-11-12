// CMS v2 → user's chat: posts a HighLevel notification summary to the user named
// in the signed actor note (minted by ghl-notification-proxy).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders as baseCors } from '../_shared/cors.ts';
import { ACTOR_HEADER, verifyActor } from '../_shared/ixty-actor.ts';
import { planDelivery } from '../_shared/ghl-notification-deliver-core.ts';

const corsHeaders = { ...baseCors, 'Access-Control-Allow-Headers': `${baseCors['Access-Control-Allow-Headers']}, ${ACTOR_HEADER}, x-ixty-shadow` };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);

  const v = await verifyActor(req.headers.get(ACTOR_HEADER), Deno.env.get('IXTY_ACTOR_SIGNING_SECRET'));
  if (!v.ok) return json({ ok: false, code: v.reason === 'config' ? 'SERVER_CONFIG' : 'ACTOR_INVALID', reason: v.reason }, v.reason === 'config' ? 500 : 401);

  let body: unknown;
  try { body = await req.json(); } catch { return json({ ok: false, code: 'INVALID_BODY' }, 400); }
  const plan = planDelivery(v.claims, body, req.headers.get('x-ixty-shadow'));
  if (!plan.ok) return json({ ok: false, code: plan.code }, plan.status);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  // The installation must still belong to the signed user.
  const { data: inst } = await supabase.from('ghl_installations').select('user_id, location_id').eq('id', v.claims.inst!).maybeSingle();
  if (!inst || inst.user_id !== plan.userId || inst.location_id !== v.claims.loc) return json({ ok: false, code: 'INSTALLATION_MISMATCH' }, 403);

  if (!plan.deliver) {
    console.log('[ghl-notification-deliver] trial copy checked, not delivered');
    return json({ ok: true, delivered: false, trial: true });
  }

  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/proactive-message-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'x-ixty-actor': req.headers.get(ACTOR_HEADER) ?? '' },
    body: JSON.stringify({ user_id: plan.userId, message: plan.message, sender: 'HighLevel', metadata: { source: 'ghl_notification', location_id: v.claims.loc } }),
  });
  if (!r.ok) {
    console.warn('[ghl-notification-deliver] delivery failed', r.status);
    return json({ ok: false, code: 'DELIVERY_FAILED' }, 502);
  }
  return json({ ok: true, delivered: true });
});
