import { logger } from '@/utils/logging';
import {
  fetchStaticSiteConfig,
  getConfigFromEnvironment,
  readConfigFromLocalStorage,
  writeConfigToLocalStorage,
  clearLocalStorageConfig,
  convertSupabaseConfigToSiteConfig,
  convertSiteConfigToSupabaseConfig
} from '@/services/site-config/site-config-file-service';
import { fetchBootstrapConfig, testBootstrapConnection } from '@/services/supabase/bootstrap-service';
import { SupabaseConfig } from '@/config/supabase/types';
import { getEnvironmentId } from '@/config/supabase/environment';
import { ConfigSource, ConfigLoadResult, ConfigLoader } from './config-loader-types';
import { validateConfig } from './config-validation';
export { ConfigSource };
export type { ConfigLoadResult };

const now = () => new Date().toISOString();
const createConfig = (url: string, anonKey: string, serviceKey?: string, inited = true) => ({
  url: url.trim(), anonKey: anonKey.trim(),
  ...(serviceKey ? { serviceKey: serviceKey.trim() } : {}),
  isInitialized: inited, savedAt: now(), environment: getEnvironmentId()
});

const emptyFieldErr = (f: string) => `Config contains empty or invalid value: ${f}`;
const returnErr = (config: null, source: ConfigSource, error: string) => ({ config, source, error });

function isEmpty(val?: string) { return !val || !val.trim(); }
function validFields(obj: any, fields: string[]) {
  for(const f of fields) if(isEmpty(obj?.[f])) return emptyFieldErr(f);
  return null;
}
function valResult(obj: any, source: ConfigSource, extraFields?: string[]) {
  const err = validFields(obj, ['supabaseUrl','supabaseAnonKey', ...(extraFields||[])]);
  if (err) return returnErr(null, source, err);
  return {
    config: createConfig(obj.supabaseUrl, obj.supabaseAnonKey),
    source
  };
}

export async function loadFromUrlParameters(): Promise<ConfigLoadResult> {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const publicUrl = urlParams.get('public_url') || urlParams.get('supabase_url');
    const publicKey = urlParams.get('public_key') || urlParams.get('supabase_key') || urlParams.get('anon_key');
    if (isEmpty(publicUrl) || isEmpty(publicKey))
      return returnErr(null, ConfigSource.URL_PARAMETERS, 'URL parameters contain empty values');
    const test = await testBootstrapConnection(publicUrl!, publicKey!);
    if (!test.isConnected) return returnErr(null, ConfigSource.URL_PARAMETERS, `Connection test failed: ${test.error}`);
    const boot = await fetchBootstrapConfig(publicUrl!, publicKey!);
    if ('error' in boot) return returnErr(null, ConfigSource.URL_PARAMETERS, `Bootstrap failed: ${boot.error}`);
    const config = createConfig(boot.url, boot.anonKey, boot.serviceKey, boot.isInitialized ?? true);
    const validation = validateConfig(config);
    if (!validation.valid) return returnErr(null, ConfigSource.URL_PARAMETERS, `Validation failed: ${validation.errors?.join(', ')}`);
    return { config: validation.config, source: ConfigSource.URL_PARAMETERS };
  } catch (e: any) {
    return returnErr(null, ConfigSource.URL_PARAMETERS, e?.message ?? String(e));
  }
}

export async function loadFromStaticFile(): Promise<ConfigLoadResult> {
  let retries = 3, staticConfig = null, lastErr;
  while (retries-- && !staticConfig) {
    try { staticConfig = await fetchStaticSiteConfig(); }
    catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 500 * (3 - retries))); }
  }
  if (!staticConfig)
    return returnErr(null, ConfigSource.STATIC_FILE, lastErr instanceof Error ? lastErr.message : 'Static config fetch failed');
  // Validate and repair
  const { isValidUrl, attemptUrlFormatRepair } = await import('./config-validation');
  let url = staticConfig.supabaseUrl;
  if (!isValidUrl(url ?? '')) url = attemptUrlFormatRepair(url ?? '') || url;
  if (isEmpty(url) || isEmpty(staticConfig.supabaseAnonKey))
    return returnErr(null, ConfigSource.STATIC_FILE, 'Static config contains empty values');
  const config = createConfig(url, staticConfig.supabaseAnonKey);
  return { config, source: ConfigSource.STATIC_FILE };
}

export function loadFromLocalStorage(): ConfigLoadResult {
  try {
    const localConfig = readConfigFromLocalStorage();
    if (!localConfig || isEmpty(localConfig.supabaseUrl) || isEmpty(localConfig.supabaseAnonKey)) {
      clearLocalStorageConfig();
      return returnErr(null, ConfigSource.LOCAL_STORAGE, 'Local storage config contains empty values');
    }
    return { config: createConfig(localConfig.supabaseUrl, localConfig.supabaseAnonKey), source: ConfigSource.LOCAL_STORAGE };
  } catch (e: any) {
    return returnErr(null, ConfigSource.LOCAL_STORAGE, e?.message ?? String(e));
  }
}

export function loadFromEnvironment(): ConfigLoadResult {
  try {
    const envConfig = getConfigFromEnvironment();
    if (!envConfig || isEmpty(envConfig.supabaseUrl) || isEmpty(envConfig.supabaseAnonKey))
      return returnErr(null, ConfigSource.ENVIRONMENT, 'Environment vars empty');
    return { config: createConfig(envConfig.supabaseUrl, envConfig.supabaseAnonKey), source: ConfigSource.ENVIRONMENT };
  } catch (e: any) {
    return returnErr(null, ConfigSource.ENVIRONMENT, e?.message ?? String(e));
  }
}

export async function loadFromDatabase(defaultUrl?: string, defaultKey?: string): Promise<ConfigLoadResult> {
  try {
    if (isEmpty(defaultUrl) || isEmpty(defaultKey))
      return returnErr(null, ConfigSource.DATABASE, 'No default credentials for DB');
    const boot = await fetchBootstrapConfig(defaultUrl!.trim(), defaultKey!.trim());
    if ('error' in boot)
      return returnErr(null, ConfigSource.DATABASE, boot.error || 'Bootstrap config error');
    if (isEmpty(boot.url) || isEmpty(boot.anonKey))
      return returnErr(null, ConfigSource.DATABASE, 'DB returned incomplete config');
    return { config: createConfig(boot.url, boot.anonKey, boot.serviceKey, boot.isInitialized ?? true), source: ConfigSource.DATABASE };
  } catch (e: any) {
    return returnErr(null, ConfigSource.DATABASE, e?.message ?? String(e));
  }
}

export function getDefaultConfig(): ConfigLoadResult {
  try {
    const url = import.meta.env.VITE_DEFAULT_SUPABASE_URL || '', key = import.meta.env.VITE_DEFAULT_SUPABASE_ANON_KEY || '';
    if (isEmpty(url) || isEmpty(key)) return { config: null, source: ConfigSource.DEFAULT };
    return { config: createConfig(url, key, undefined, false), source: ConfigSource.DEFAULT };
  } catch (e: any) {
    return returnErr(null, ConfigSource.DEFAULT, e?.message ?? String(e));
  }
}

export async function loadConfiguration(): Promise<ConfigLoadResult> {
  for (const loader of [
    async () => await loadFromUrlParameters(),
    async () => await loadFromStaticFile(),
    () => loadFromLocalStorage(),
    () => loadFromEnvironment(),
    async () => {
      const def = getDefaultConfig();
      if (!def.config) return returnErr(null, ConfigSource.NONE, "No config anywhere");
      const db = await loadFromDatabase(def.config.url, def.config.anonKey);
      return db.config ? db : def;
    }
  ]) {
    const res = await loader();
    if (res.config) {
      // Save to localStorage for all except LOCAL_STORAGE itself
      if (res.source !== ConfigSource.LOCAL_STORAGE) {
        const siteConfig = convertSupabaseConfigToSiteConfig(res.config);
        writeConfigToLocalStorage(siteConfig);
      }
      return res;
    }
  }
  return returnErr(null, ConfigSource.NONE, 'No configuration found from any source');
}

export function saveConfiguration(config: SupabaseConfig): boolean {
  try {
    if (!config) return false;
    const validation = validateConfig(config);
    if (!validation.valid) return false;
    const siteConfig = convertSupabaseConfigToSiteConfig(config);
    if (!writeConfigToLocalStorage(siteConfig)) {
      try {
        const storageKey = getEnvironmentId();
        localStorage.setItem(`spark_supabase_config_${storageKey}`, JSON.stringify(config));
        return true;
      } catch {}
    }
    return true;
  } catch { return false; }
}

export const configLoader: ConfigLoader = { loadConfiguration, saveConfiguration };