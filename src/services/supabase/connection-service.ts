import { createClient, SupabaseClient, PostgrestQueryBuilder } from '@supabase/supabase-js';
import { getStoredConfig, saveConfig, clearConfig } from '@/config/supabase-config';
import { fetchStaticSiteConfig } from '@/services/site-config/site-config-file-service';
import { logger } from '@/utils/logging';
import { toast } from '@/hooks/use-toast';

// --- Reusable helpers ---

const getConnectionKey = (k: string) => `supabase_${k}`;
const getEnvId = () => window.location.hostname;
const now = () => new Date().toISOString();

type Database = any;
export interface ConnectionTestResult { isConnected: boolean; error?: string; errorCode?: string; }
interface ConnectionState { lastAttempt: string; lastSuccess: string|null; attemptCount: number; source: string; error?: string; }
interface EnvironmentInfo { id: string; host: string; timestamp: string; userAgent?: string; }

// --- Supabase singleton holder ---
let supabaseInstance: SupabaseClient | null = null;
let isInitializingClient = false;

// --- Locking ---
const lockKey = getConnectionKey('initialization_lock'), lockTimeKey = getConnectionKey('initialization_timestamp');
const acquireInitializationLock = (): boolean => {
  try {
    const t = localStorage.getItem(lockTimeKey);
    if (localStorage.getItem(lockKey) && t && (Date.now() - new Date(t).getTime()) < 10_000) return false;
    localStorage.setItem(lockKey, Math.random().toString(36).substr(2,8));
    localStorage.setItem(lockTimeKey, now());
    return true;
  } catch { return false; }
};
const releaseInitializationLock = () => { try { localStorage.removeItem(lockKey); } catch {} };

// --- Centralized config build ---
const buildConfig = ({ url, anonKey, serviceKey = '', lastUpdated }: any) => ({
  url, anonKey, serviceKey, isInitialized: true, savedAt: lastUpdated || now(), environment: getEnvId()
});

// --- Core logic ---

export async function testSupabaseConnection(url: string, anonKey: string): Promise<ConnectionTestResult> {
  if (!url?.trim() || !anonKey?.trim())
    return {isConnected: false, error: 'Empty credentials provided', errorCode:'EMPTY_CREDENTIALS'};
  const client = createClient(url.trim(), anonKey.trim(), {auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const { error } = await client.from('app_settings').select('count(*)', { count: 'exact' });
    if (error) return {isConnected: false, error: error.message, errorCode: error.code};
    const { error:authError } = await client.auth.getSession();
    if (authError) return {isConnected: false, error: `Auth check failed: ${authError.message}`, errorCode:'AUTH_ERROR' };
    return { isConnected: true };
  } catch (e: any) {
    return {isConnected:false, error:e?.message||String(e), errorCode:'UNKNOWN_ERROR'};
  }
}

// --- Supabase client (singleton) ---
export async function getSupabaseClient() {
  if (supabaseInstance?.from) return supabaseInstance;
  if ((window as any)?.supabaseInstance?.from) {
    supabaseInstance = (window as any).supabaseInstance;
    try { if (supabaseInstance.from('test_table').select) return supabaseInstance; }
    catch { supabaseInstance = (window as any).supabaseInstance = null; }
  }
  if (isInitializingClient) { await new Promise(r=>setTimeout(r,100)); return supabaseInstance || (window as any).supabaseInstance; }
  isInitializingClient = true;
  const lockAcquired = acquireInitializationLock();
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset_config') === 'true') { clearConfig(); releaseInitializationLock(); return null; }
    if (urlParams.get('force_init') === 'true') { releaseInitializationLock(); return null; }

    // If URL params present
    let url = urlParams.get('supabase_url'), anonKey = urlParams.get('supabase_key');
    if (url?.trim() && anonKey?.trim()) {
      supabaseInstance = createSupabaseClient(url, anonKey, true);
      return supabaseInstance;
    }

    // If config in storage
    let cfg = getStoredConfig();
    if (cfg?.url?.trim() && cfg?.anonKey?.trim()) {
      supabaseInstance = createSupabaseClient(cfg.url, cfg.anonKey, true);
      (window as any).supabaseInstance = supabaseInstance;
      localStorage.setItem(getConnectionKey('last_connection_time'), now());
      updateConnectionState({ lastAttempt: now(), lastSuccess: now(), attemptCount: 1, source: 'stored_config' });
      subscribePermissionFix(supabaseInstance);
      setTimeout(async ()=>{ if (!await checkConnectionHealth()) await attemptConnectionRepair(); startConnectionMonitoring(); await checkAndFixUserPermissions(); }, 1000);
      return supabaseInstance;
    }

    // Try static site-config.json
    const staticConfig = await fetchStaticSiteConfig();
    if (staticConfig?.supabaseUrl?.trim() && staticConfig?.supabaseAnonKey?.trim()) {
      const conf = buildConfig({ url: staticConfig.supabaseUrl, anonKey: staticConfig.supabaseAnonKey, lastUpdated: staticConfig.lastUpdated });
      saveConfig(conf);
      resetSupabaseClient();
      supabaseInstance = createSupabaseClient(conf.url, conf.anonKey, true);
      (window as any).supabaseInstance = supabaseInstance;
      return supabaseInstance;
    }
    // Try bootstrap
    await checkPublicBootstrapConfig();

    if (lockAcquired) releaseInitializationLock();
    supabaseInstance = initializeClientWithFallback() as SupabaseClient<any, "public", any>;
    return supabaseInstance;
  } catch (e) {
    updateConnectionState({ lastAttempt: now(), lastSuccess: null, attemptCount: getConnectionState().attemptCount+1, source: 'error', error: e instanceof Error? e.message:String(e)});
    toast({title:'Connection Error', description:'Could not connect to database. Please check configuration.',
      variant:'destructive', action:{altText:"Reconnect",onClick:()=>window.location.href='/initialize'}});
    if (lockAcquired) releaseInitializationLock();
    return null;
  } finally { isInitializingClient = false; }
}

const createSupabaseClient = (url: string, anonKey: string, persist = true) =>
  createClient<Database>(url, anonKey, {
    auth: {
      storage: localStorage,
      persistSession: persist,
      autoRefreshToken: persist,
      debug: !!(process.env.NODE_ENV === 'development')
    }
  });

const subscribePermissionFix = (client: SupabaseClient) =>
  client.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') checkAndFixUserPermissions().catch(err=>logger.error('Error checking permissions after auth change', err));
  });

// --- Mini utilities ---
export function resetSupabaseClient() {
  logger.info('Resetting Supabase client instance',{module: 'supabase-connection'});
  supabaseInstance = null;
  if (window) (window as any).supabaseInstance = null;
  releaseInitializationLock();
}

export function getConnectionInfo() {
  const c = getStoredConfig();
  const k = (k:string)=>localStorage.getItem(getConnectionKey(k));
  let env;
  try { env = JSON.parse((k('environment_info')||'')) } catch { env = {id:window.location.hostname}; }
  return {
    connectionId: k('connection_id')||'not_set',
    environment: env || {id:getEnvId(), host: window.location.hostname, timestamp: now(), userAgent: navigator.userAgent},
    lastConnection: k('last_connection_time')||'never',
    connectionState: getConnectionState(),
    hasStoredConfig: !!c,
    url: c?.url ? c.url.split('//')[1] : 'No stored config',
    configTimestamp: c?.savedAt || 'unknown'
  };
}

function updateConnectionState(state: Partial<ConnectionState>) {
  try {
    const n = { ...getConnectionState(), ...state };
    localStorage.setItem(getConnectionKey('connection_state'), JSON.stringify(n));
    return true;
  } catch (e) {
    logger.error('Error updating connection state', e, {module: 'supabase-connection'}); return false;
  }
}

function getConnectionState(): ConnectionState {
  try {
    const stateJson = localStorage.getItem(getConnectionKey('connection_state'));
    return stateJson ? JSON.parse(stateJson) : { lastAttempt: '', lastSuccess: null, attemptCount: 0, source: '' };
  } catch { return { lastAttempt: '', lastSuccess: null, attemptCount: 0, source: '', error: 'Error reading state' }; }
}

export async function checkConnectionHealth(): Promise<boolean> {
  if (!supabaseInstance) return false;
  const controller = new AbortController(), timeoutId = setTimeout(() => controller.abort(), 5_000);
  try {
    const { error } = await supabaseInstance.from('profiles').select('id').limit(1).abortSignal(controller.signal);
    clearTimeout(timeoutId);
    return !error || error.code === '42P01';
  } catch (e:any) {
    clearTimeout(timeoutId);
    return !(e && e.name === 'AbortError');
  }
}

export async function checkAndFixUserPermissions(): Promise<boolean> {
  if (!supabaseInstance) return false;
  const { data: { user }, error: userError } = await supabaseInstance.auth.getUser();
  if (userError || !user) return false;
  const { data: profile, error: profileError } = await supabaseInstance.from('profiles').select('id').eq('id', user.id).single();
  if (profileError || !profile) {
    const { error: insertError } = await supabaseInstance.from('profiles').insert({ id: user.id, updated_at: now() });
    if (insertError) return false;
  }
  return true;
}

export function startConnectionMonitoring(intervalMs = 60_000): () => void {
  let interval: number | null = null;
  const check = async () => {
    const isHealthy = await checkConnectionHealth();
    updateConnectionState({ lastAttempt: now(), lastSuccess: isHealthy ? now() : getConnectionState().lastSuccess,
      attemptCount: getConnectionState().attemptCount + 1, source: getConnectionState().source,
      error: isHealthy?undefined:'Connection health check failed' });
    if (!isHealthy && await attemptConnectionRepair()) updateConnectionState({ lastSuccess: now(), error: undefined });
  };
  if (window) { interval = window.setInterval(check, intervalMs); check(); }
  return () => { if (interval && window) window.clearInterval(interval); };
}

export async function attemptConnectionRepair(): Promise<boolean> {
  const ci = getConnectionInfo(), cfg = getStoredConfig();
  if (ci.hasStoredConfig && cfg?.url) {
    resetSupabaseClient(); if (await checkConnectionHealth()) return true;
    try {
      const { attemptUrlFormatRepair } = await import('@/services/supabase/config-validation');
      const repairedUrl = attemptUrlFormatRepair(cfg.url);
      if (repairedUrl && repairedUrl!==cfg.url) {
        const test = await testSupabaseConnection(repairedUrl, cfg.anonKey);
        if (typeof test==='object' && test.isConnected) {
          configLoader.saveConfiguration({ ...cfg, url: repairedUrl }); resetSupabaseClient();
          try {
            const { createSiteConfig, updateStaticSiteConfig } = await import('@/services/site-config/site-config-file-service');
            await updateStaticSiteConfig(createSiteConfig(repairedUrl, cfg.anonKey));
          } catch {}
          return true;
        }
      }
    } catch {}
    const result = await configLoader.loadConfiguration?.(); // If present
    if (result?.config) { configLoader.saveConfiguration(result.config); resetSupabaseClient(); if (await checkConnectionHealth()) return true; }
    if (cfg?.serviceKey) {
      const tempClient = createClient(cfg.url, cfg.serviceKey, {auth:{persistSession:false,autoRefreshToken:false}});
      try {
        const { data, error } = await tempClient.from('app_settings').select('key, value').in('key', ['supabase_url', 'supabase_anon_key']);
        if (!error && data?.length > 0) {
          const updatedCfg = { url: data.find((i:any) => i.key==="supabase_url")?.value || cfg.url,
            anonKey: data.find((i:any) => i.key==="supabase_anon_key")?.value || cfg.anonKey,
            serviceKey: cfg.serviceKey, isInitialized:true, savedAt: now(), environment: cfg.environment };
          configLoader.saveConfiguration(updatedCfg); resetSupabaseClient(); if (await checkConnectionHealth()) return true;
        }
      } catch {}
    }
  }
  return false;
}

export function isConfigEmpty(): boolean {
  try {
    const c = getStoredConfig();
    if (!c || !c.url?.trim() || !c.anonKey?.trim()) { clearConfig(); return true; }
    return false;
  } catch { return true; }
}

const bypassRoutes = ['/initialize','/auth/error','/api/','/debug'];
export function shouldBypassRedirect(pathname: string): boolean {
  return bypassRoutes.some(route => pathname.startsWith(route));
}

export async function checkPublicBootstrapConfig(): Promise<boolean> {
  const c = getStoredConfig();
  if (c?.url?.trim() && c?.anonKey?.trim()) return true;
  try {
    const publicConfig = await fetchStaticSiteConfig();
    if (publicConfig?.supabaseUrl?.trim() && publicConfig?.supabaseAnonKey?.trim()) {
      saveConfig(buildConfig({ url: publicConfig.supabaseUrl, anonKey: publicConfig.supabaseAnonKey, lastUpdated: publicConfig.lastUpdated }));
      return true;
    }
  } catch {}
  return false;
}

function initializeClientWithFallback() {
  try {
    const durl = 'https://example.supabase.co', dkey = 'dummy-key';
    const c = createClient(durl, dkey, {auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
    if (!c.auth) throw new Error('Auth object not initialized in fallback client');
    if (typeof c.auth.getSession!=='function') c.auth.getSession = async () => ({ data: { session: null }, error: null });
    if (typeof c.from!=='function') c.from = () => fallbackFromFallback();
    return c;
  } catch {
    const fallbackClient = {
      auth: { getSession: async()=>({data:{session:null},error:null}), onAuthStateChange:()=>({unsubscribe:()=>{}})},
      from: fallbackFromFallback
    };
    if (window) (window as any).supabaseInstance = fallbackClient;
    return fallbackClient;
  }
}
function fallbackFromFallback() {
  return {
    select: () => Promise.resolve({ data: null, error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
    eq: () => ({ select: () => Promise.resolve({ data: null, error: null }), single: () => Promise.resolve({ data: null, error: null }) }),
    single: () => Promise.resolve({ data: null, error: null }),
    upsert: () => Promise.resolve({ data: null, error: null }),
  } as unknown as PostgrestQueryBuilder<any, any, any, unknown>;
}

let isCheckingRedirect = false;
export async function getRedirectPath(): Promise<string | null> {
  if (isCheckingRedirect) return null;
  isCheckingRedirect = true;
  try {
    const pathname = window.location.pathname;
    if (shouldBypassRedirect(pathname)) return isCheckingRedirect = false, null;
    try {
      const c = getStoredConfig();
      if (c?.url?.trim() && c?.anonKey?.trim()) return isCheckingRedirect = false, null;
    } catch {}
    try {
      const staticConfig = await fetchStaticSiteConfig();
      if (staticConfig?.supabaseUrl?.trim() && staticConfig?.supabaseAnonKey?.trim()) {
        saveConfig(buildConfig({url: staticConfig.supabaseUrl, anonKey: staticConfig.supabaseAnonKey, lastUpdated: staticConfig.lastUpdated}));
        return isCheckingRedirect = false, null;
      }
    } catch {}
    return isCheckingRedirect = false, '/initialize';
  } catch { return isCheckingRedirect = false, '/initialize'; }
}

// Short configLoader for attemptConnectionRepair()
const configLoader = {
  loadConfiguration: async () => {
    try {
      const c = await fetchStaticSiteConfig();
      if (c?.supabaseUrl?.trim() && c?.supabaseAnonKey?.trim())
        return { config: buildConfig({ url: c.supabaseUrl, anonKey: c.supabaseAnonKey, lastUpdated: c.lastUpdated }), source: 'STATIC_FILE' };
      return { config: null };
    } catch (e) { logger.error('Error loading static configuration', e); return { config: null }; }
  },
  saveConfiguration: saveConfig
};