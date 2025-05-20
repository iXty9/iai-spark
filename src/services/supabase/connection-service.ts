
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getStoredConfig, saveConfig, clearConfig } from '@/config/supabase-config';
import { fetchStaticSiteConfig } from '@/services/site-config/site-config-file-service';
import { logger } from '@/utils/logging';
import { toast } from '@/hooks/use-toast';

// --- Reusable helpers ---

const getConnectionKey = (k: string) => `supabase_${k}`;
const getEnvId = () => window.location.hostname;
const now = () => new Date().toISOString();

type Database = any;
export interface ConnectionTestResult { 
  isConnected: boolean; 
  error?: string; 
  errorCode?: string; 
  hasPermissions?: boolean;
}
interface ConnectionState { lastAttempt: string; lastSuccess: string|null; attemptCount: number; source: string; error?: string; }
interface EnvironmentInfo { id: string; host: string; timestamp: string; userAgent?: string; }

// --- Supabase singleton holder ---
let supabaseInstance: SupabaseClient | null = null;
let isInitializingClient = false;

// --- Tab visibility tracking ---
let isTabVisible = true;
const checkTabVisibility = () => {
  isTabVisible = document.visibilityState === 'visible';
  logger.debug('Tab visibility changed', { isVisible: isTabVisible }, { module: 'supabase-connection' });
};

// Register visibility change listener
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', checkTabVisibility);
  checkTabVisibility(); // Initialize
}

// --- Locking ---
const lockKey = getConnectionKey('initialization_lock'), lockTimeKey = getConnectionKey('initialization_timestamp');
const acquireInitializationLock = (): boolean => {
  try {
    const t = localStorage.getItem(lockTimeKey);
    if (localStorage.getItem(lockKey) && t && (Date.now() - new Date(t).getTime()) < 10_000) return false;
    localStorage.setItem(lockKey, Math.random().toString(36).substring(2,8));
    localStorage.setItem(lockTimeKey, now());
    return true;
  } catch { return false; }
};
const releaseInitializationLock = () => { try { localStorage.removeItem(lockKey); } catch {} };

// --- Centralized config build ---
const buildConfig = ({ url, anonKey, serviceKey = '', lastUpdated }: any) => ({
  url, anonKey, serviceKey, isInitialized: true, savedAt: lastUpdated || now(), environment: getEnvId()
});

// --- Config caching ---
const configCache = {
  lastCheck: 0,
  cachedConfig: null as any,
  // Cache config results for 5 minutes
  cacheExpiry: 5 * 60 * 1000,
  hasValidCache() {
    return this.cachedConfig && (Date.now() - this.lastCheck < this.cacheExpiry);
  },
  updateCache(config: any) {
    this.cachedConfig = config;
    this.lastCheck = Date.now();
  },
  invalidate() {
    this.cachedConfig = null;
    this.lastCheck = 0;
  }
};

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
    return { isConnected: true, hasPermissions: true };
  } catch (e: any) {
    return {isConnected:false, error:e?.message||String(e), errorCode:'UNKNOWN_ERROR'};
  }
}

// --- Supabase client (singleton) ---
export async function getSupabaseClient() {
  // If we have a cached instance, return it
  if (supabaseInstance?.from) return supabaseInstance;
  
  // Check for instance on window object
  if ((window as any)?.supabaseInstance?.from) {
    supabaseInstance = (window as any).supabaseInstance;
    try { if (supabaseInstance.from('test_table').select) return supabaseInstance; }
    catch { supabaseInstance = (window as any).supabaseInstance = null; }
  }
  
  // Avoid concurrent initialization
  if (isInitializingClient) { 
    await new Promise(r=>setTimeout(r,100)); 
    return supabaseInstance || (window as any).supabaseInstance; 
  }
  
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

    // Check cache first before accessing storage
    if (configCache.hasValidCache() && configCache.cachedConfig?.url?.trim() && configCache.cachedConfig?.anonKey?.trim()) {
      logger.info('Using cached Supabase config', { module: 'supabase-connection', source: 'cache' });
      supabaseInstance = createSupabaseClient(configCache.cachedConfig.url, configCache.cachedConfig.anonKey, true);
      (window as any).supabaseInstance = supabaseInstance;
      updateConnectionState({ lastAttempt: now(), lastSuccess: now(), attemptCount: 1, source: 'cached_config' });
      subscribePermissionFix(supabaseInstance);
      return supabaseInstance;
    }

    // If config in storage
    let cfg = getStoredConfig();
    if (cfg?.url?.trim() && cfg?.anonKey?.trim()) {
      // Update cache
      configCache.updateCache(cfg);
      
      supabaseInstance = createSupabaseClient(cfg.url, cfg.anonKey, true);
      (window as any).supabaseInstance = supabaseInstance;
      localStorage.setItem(getConnectionKey('last_connection_time'), now());
      updateConnectionState({ lastAttempt: now(), lastSuccess: now(), attemptCount: 1, source: 'stored_config' });
      subscribePermissionFix(supabaseInstance);
      
      // Initialize health monitoring in background
      setTimeout(async () => {
        const isHealthy = await checkConnectionHealth();
        if (!isHealthy) {
          await attemptConnectionRepair();
        } 
        startConnectionMonitoring();
        await checkAndFixUserPermissions();
      }, 1000);
      
      return supabaseInstance;
    }

    // Try static site-config.json - but don't make this request if we're on a non-critical path
    // to avoid unnecessary traffic
    if (!shouldBypassRedirect(window.location.pathname)) {
      const staticConfig = await fetchStaticSiteConfig();
      if (staticConfig?.supabaseUrl?.trim() && staticConfig?.supabaseAnonKey?.trim()) {
        const conf = buildConfig({ url: staticConfig.supabaseUrl, anonKey: staticConfig.supabaseAnonKey, lastUpdated: staticConfig.lastUpdated });
        saveConfig(conf);
        configCache.updateCache(conf);
        resetSupabaseClient();
        supabaseInstance = createSupabaseClient(conf.url, conf.anonKey, true);
        (window as any).supabaseInstance = supabaseInstance;
        return supabaseInstance;
      }
    }
    
    // Try bootstrap - only if we're on a path that requires it
    if (!shouldBypassRedirect(window.location.pathname)) {
      await checkPublicBootstrapConfig();
    }

    if (lockAcquired) releaseInitializationLock();
    supabaseInstance = initializeClientWithFallback() as SupabaseClient<any, "public", any>;
    return supabaseInstance;
  } catch (e) {
    updateConnectionState({ lastAttempt: now(), lastSuccess: null, attemptCount: getConnectionState().attemptCount+1, source: 'error', error: e instanceof Error? e.message:String(e)});
    
    // Only show toast on critical paths, not for background operations
    if (!shouldBypassRedirect(window.location.pathname)) {
      toast({title:'Connection Error', description:'Could not connect to database. Please check configuration.',
        variant:'destructive', action:{altText:"Reconnect",onClick:()=>window.location.href='/initialize'}});
    }
    
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
  client.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      try {
        await checkAndFixUserPermissions();
      } catch (err) {
        logger.error('Error checking permissions after auth change', err);
      }
    }
  });

// --- Mini utilities ---
export function resetSupabaseClient() {
  logger.info('Resetting Supabase client instance',{module: 'supabase-connection'});
  supabaseInstance = null;
  if (window) (window as any).supabaseInstance = null;
  configCache.invalidate();
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

// Monitoring intervals in milliseconds
const ACTIVE_TAB_INTERVAL = 5 * 60 * 1000;   // 5 minutes when tab is active
const INACTIVE_TAB_INTERVAL = 15 * 60 * 1000; // 15 minutes when tab is inactive

export function startConnectionMonitoring(initialIntervalMs = ACTIVE_TAB_INTERVAL): () => void {
  let interval: number | null = null;
  let currentInterval = initialIntervalMs;
  
  const check = async () => {
    // Skip checks if tab is not visible
    if (!isTabVisible) {
      logger.debug('Skipping connection health check in background tab', {}, { module: 'supabase-connection' });
      return;
    }
    
    const isHealthy = await checkConnectionHealth();
    
    updateConnectionState({ 
      lastAttempt: now(), 
      lastSuccess: isHealthy ? now() : getConnectionState().lastSuccess,
      attemptCount: getConnectionState().attemptCount + 1, 
      source: getConnectionState().source,
      error: isHealthy ? undefined : 'Connection health check failed' 
    });
    
    const didRepair = !isHealthy ? await attemptConnectionRepair() : false;
    if (didRepair) {
      updateConnectionState({ lastSuccess: now(), error: undefined });
    }
  };
  
  // Update interval based on tab visibility
  const updateMonitoringInterval = () => {
    if (interval !== null && window) {
      window.clearInterval(interval);
    }
    
    currentInterval = isTabVisible ? ACTIVE_TAB_INTERVAL : INACTIVE_TAB_INTERVAL;
    
    if (window) {
      interval = window.setInterval(check, currentInterval);
      logger.debug('Updated connection monitoring interval', { 
        isTabVisible, 
        intervalMs: currentInterval 
      }, { module: 'supabase-connection' });
    }
  };
  
  // Set initial interval
  updateMonitoringInterval();
  
  // Add visibility change handler to adjust interval
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', updateMonitoringInterval);
  }
  
  // Run initial check
  check();
  
  // Return cleanup function
  return () => { 
    if (interval !== null && window) {
      window.clearInterval(interval);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', updateMonitoringInterval);
    }
  };
}

let repairAttemptTimestamps: number[] = [];
const MAX_REPAIR_ATTEMPTS = 3;
const REPAIR_COOLDOWN = 10 * 60 * 1000; // 10 minutes

export async function attemptConnectionRepair(): Promise<boolean> {
  // Rate limiting for repair attempts
  const now = Date.now();
  
  // Remove timestamps older than cooldown period
  repairAttemptTimestamps = repairAttemptTimestamps.filter(ts => (now - ts) < REPAIR_COOLDOWN);
  
  // If we've exceeded the maximum number of attempts in the cooldown period, skip repair
  if (repairAttemptTimestamps.length >= MAX_REPAIR_ATTEMPTS) {
    logger.warn('Connection repair rate limited', { 
      attemptsInWindow: repairAttemptTimestamps.length,
      cooldownMs: REPAIR_COOLDOWN
    }, { module: 'supabase-connection' });
    return false;
  }
  
  // Record this attempt
  repairAttemptTimestamps.push(now);
  
  const ci = getConnectionInfo(), cfg = getStoredConfig();
  if (ci.hasStoredConfig && cfg?.url) {
    resetSupabaseClient(); 
    const isHealthy = await checkConnectionHealth(); 
    if (isHealthy) return true;
    
    try {
      const { attemptUrlFormatRepair } = await import('@/services/supabase/config-validation');
      const repairedUrl = attemptUrlFormatRepair(cfg.url);
      if (repairedUrl && repairedUrl!==cfg.url) {
        const test = await testSupabaseConnection(repairedUrl, cfg.anonKey);
        if (typeof test==='object' && test.isConnected) {
          configLoader.saveConfiguration({ ...cfg, url: repairedUrl }); 
          resetSupabaseClient();
          return true;
        }
      }
    } catch {}
    
    try {
      const result = await configLoader.loadConfiguration(); // If present
      if (result?.config) { 
        configLoader.saveConfiguration(result.config); 
        resetSupabaseClient(); 
        const isHealthy = await checkConnectionHealth(); 
        if (isHealthy) return true; 
      }
    } catch {}
    
    if (cfg?.serviceKey) {
      const tempClient = createClient(cfg.url, cfg.serviceKey, {auth:{persistSession:false,autoRefreshToken:false}});
      try {
        const { data, error } = await tempClient.from('app_settings').select('key, value').in('key', ['supabase_url', 'supabase_anon_key']);
        if (!error && data?.length > 0) {
          const updatedCfg = { 
            url: data.find((i:any) => i.key==="supabase_url")?.value || cfg.url,
            anonKey: data.find((i:any) => i.key==="supabase_anon_key")?.value || cfg.anonKey,
            serviceKey: cfg.serviceKey, 
            isInitialized: true, 
            savedAt: now(), 
            environment: cfg.environment 
          };
          configLoader.saveConfiguration(updatedCfg); 
          resetSupabaseClient(); 
          const isHealthy = await checkConnectionHealth();
          if (isHealthy) return true;
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

// Limits how often we check public bootstrap config
const bootstrapCheckInfo = {
  lastCheck: 0,
  checkInterval: 5 * 60 * 1000, // 5 minutes
  canCheck() {
    return Date.now() - this.lastCheck > this.checkInterval;
  },
  recordCheck() {
    this.lastCheck = Date.now();
  }
};

export async function checkPublicBootstrapConfig(): Promise<boolean> {
  const c = getStoredConfig();
  if (c?.url?.trim() && c?.anonKey?.trim()) return true;
  
  // Check if we've tried recently
  if (!bootstrapCheckInfo.canCheck()) {
    logger.debug('Skipping bootstrap check due to rate limiting', {
      lastCheck: new Date(bootstrapCheckInfo.lastCheck).toISOString(),
      nextCheck: new Date(bootstrapCheckInfo.lastCheck + bootstrapCheckInfo.checkInterval).toISOString()
    }, { module: 'bootstrap-config' });
    return false;
  }
  
  bootstrapCheckInfo.recordCheck();
  
  try {
    const publicConfig = await fetchStaticSiteConfig();
    if (publicConfig?.supabaseUrl?.trim() && publicConfig?.supabaseAnonKey?.trim()) {
      saveConfig(buildConfig({url: publicConfig.supabaseUrl, anonKey: publicConfig.supabaseAnonKey, lastUpdated: publicConfig.lastUpdated}));
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
  } as unknown as any;
}

let isCheckingRedirect = false;
export async function getRedirectPath(): Promise<string | null> {
  if (isCheckingRedirect) return null;
  isCheckingRedirect = true;
  try {
    const pathname = window.location.pathname;
    if (shouldBypassRedirect(pathname)) {
      isCheckingRedirect = false;
      return null;
    }
    
    try {
      // Use cached config when possible
      if (configCache.hasValidCache()) {
        const c = configCache.cachedConfig;
        if (c?.url?.trim() && c?.anonKey?.trim()) {
          isCheckingRedirect = false;
          return null;
        }
      } else {
        const c = getStoredConfig();
        if (c?.url?.trim() && c?.anonKey?.trim()) {
          configCache.updateCache(c);
          isCheckingRedirect = false;
          return null;
        }
      }
    } catch {}
    
    try {
      // Only check static site config if we haven't checked recently
      if (bootstrapCheckInfo.canCheck()) {
        bootstrapCheckInfo.recordCheck();
        const staticConfig = await fetchStaticSiteConfig();
        if (staticConfig?.supabaseUrl?.trim() && staticConfig?.supabaseAnonKey?.trim()) {
          saveConfig(buildConfig({url: staticConfig.supabaseUrl, anonKey: staticConfig.supabaseAnonKey, lastUpdated: staticConfig.lastUpdated}));
          configCache.updateCache(buildConfig({url: staticConfig.supabaseUrl, anonKey: staticConfig.supabaseAnonKey, lastUpdated: staticConfig.lastUpdated}));
          isCheckingRedirect = false;
          return null;
        }
      }
    } catch {}
    
    isCheckingRedirect = false;
    return '/initialize';
  } catch { 
    isCheckingRedirect = false;
    return '/initialize';
  }
}

// Short configLoader for attemptConnectionRepair()
const configLoader = {
  loadConfiguration: async () => {
    try {
      // Add rate limiting
      if (!bootstrapCheckInfo.canCheck()) {
        return { config: null };
      }
      
      bootstrapCheckInfo.recordCheck();
      const c = await fetchStaticSiteConfig();
      if (c?.supabaseUrl?.trim() && c?.supabaseAnonKey?.trim())
        return { config: buildConfig({ url: c.supabaseUrl, anonKey: c.supabaseAnonKey, lastUpdated: c.lastUpdated }), source: 'STATIC_FILE' };
      return { config: null };
    } catch (e) { logger.error('Error loading static configuration', e); return { config: null }; }
  },
  saveConfiguration: saveConfig
};

// Let's remove the setTimeout that causes a page refresh - this could be causing issues
// setTimeout(() => {
//   window.location.href = window.location.pathname + '?reset_config=true';
// }, 500);
