import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHandler, j } from './handler.ts';
import { decryptToken } from './crypto.ts';
const URL_ = Deno.env.get('SUPABASE_URL'), ANON = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), KEY = Deno.env.get('GHL_TOKEN_ENCRYPTION_KEY');
const ORIGIN = 'https://ixty.ai';
const log = (event: string, f: Record<string, string | number | boolean | null> = {}) =>
  console.log(JSON.stringify({ fn: 'ghl-token-inspect', event, ...f }));
if (!URL_ || !ANON || !SERVICE || !KEY) {
  log('config_missing');
  Deno.serve(() => j(503, { error: 'service_unavailable' }, ORIGIN));
} else {
  const svc = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  Deno.serve(createHandler({
    allowedOrigin: ORIGIN, log,
    getUser: async (h) => {
      const c = createClient(URL_, ANON, { global: { headers: { Authorization: h } }, auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await c.auth.getUser();
      return { userId: data?.user?.id ?? null, error };
    },
    isAdmin: async (id) => { const { data, error } = await svc.rpc('has_role', { _user_id: id, _role: 'admin' }); return { data, error }; },
    fetchRow: async (id) => { const { data, error } = await svc.from('ghl_installations')
      .select('id, location_id, company_id, access_token_encrypted').eq('id', id).maybeSingle(); return { data, error }; },
    decrypt: (ct) => decryptToken(ct, KEY),
  }));
}
