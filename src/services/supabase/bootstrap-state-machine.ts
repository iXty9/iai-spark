import { logger } from '@/utils/logging';
import { configLoader } from './config-loader';
import { ConfigSource } from './config-loader-types';
import { resetSupabaseClient, getSupabaseClient, shouldBypassRedirect } from './connection-service';
import { getEnvironmentInfo } from '@/config/supabase/environment';
import { clearConfig } from '@/config/supabase-config';
import { isValidUrl } from './config-validation';

export enum BootstrapState {
  INITIAL = 'initial',
  LOADING = 'loading',
  CONFIG_FOUND = 'config_found',
  CONFIG_MISSING = 'config_missing',
  CONNECTION_ERROR = 'connection_error',
  CONNECTION_SUCCESS = 'connection_success',
  COMPLETE = 'complete'
}
export enum ErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  DATABASE = 'database',
  CONFIG = 'config',
  UNKNOWN = 'unknown'
}
export interface BootstrapContext {
  state: BootstrapState;
  error?: string;
  errorType?: ErrorType;
  configSource?: ConfigSource;
  retryCount: number;
  lastAttempt: string;
  lastSuccess?: string;
  environment: string;
}
const BOOTSTRAP_STATE_KEY = 'supabase_bootstrap_state';

const createDefaultContext = (): BootstrapContext => ({
  state: BootstrapState.INITIAL,
  retryCount: 0,
  lastAttempt: new Date().toISOString(),
  environment: getEnvironmentInfo().id
});

export function initBootstrapContext(): BootstrapContext {
  try {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch {
      logger.warn('localStorage not available', { module: 'bootstrap-state-machine' });
      return createDefaultContext();
    }
    if (shouldBypassRedirect(window.location.pathname)) {
      logger.info('Bypass route, using default context', { module: 'bootstrap-state-machine' });
      return createDefaultContext();
    }
    const saved = localStorage.getItem(BOOTSTRAP_STATE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as BootstrapContext;
        if ((Date.now() - new Date(parsed.lastAttempt).getTime()) / 36e5 > 1) {
          logger.info('Context expired, new context', { module: 'bootstrap-state-machine' });
          return createDefaultContext();
        }
        return { ...parsed, state: BootstrapState.INITIAL };
      } catch (e) {
        logger.error('Failed to parse bootstrap context', e, { module: 'bootstrap-state-machine' });
        return createDefaultContext();
      }
    }
    logger.info('No saved context, creating new', { module: 'bootstrap-state-machine' });
    return createDefaultContext();
  } catch (e) {
    logger.error('Error initializing bootstrap context', e, { module: 'bootstrap-state-machine' });
    return createDefaultContext();
  }
}

export const saveBootstrapContext = (ctx: BootstrapContext) => {
  try { localStorage.setItem(BOOTSTRAP_STATE_KEY, JSON.stringify(ctx)); }
  catch (e) { logger.error('Error saving context', e, { module: 'bootstrap-state-machine' }); }
};

export const clearBootstrapContext = () => {
  try { localStorage.removeItem(BOOTSTRAP_STATE_KEY); }
  catch (e) { logger.error('Error clearing context', e, { module: 'bootstrap-state-machine' }); }
};

export function determineErrorType(error: string): ErrorType {
  if (!error) return ErrorType.UNKNOWN;
  const e = error.toLowerCase();
  if (
    /invalid|malformed/.test(e) && /url|format/.test(e) ||
    e.includes('url format') || e.includes('invalid format')
  ) return ErrorType.CONFIG;
  if (/network|fetch|connection|timeout|cors/.test(e)) return ErrorType.NETWORK;
  if (/auth|unauthorized|permission|forbidden|credentials/.test(e)) return ErrorType.AUTH;
  if (/database|table|sql|query|schema/.test(e)) return ErrorType.DATABASE;
  if (/config|settings|initialization/.test(e)) return ErrorType.CONFIG;
  return ErrorType.UNKNOWN;
}

function transitionTo(
  ctx: BootstrapContext,
  state: BootstrapState,
  onChange: (c: BootstrapContext) => void,
  extra: Partial<BootstrapContext> = {}
) {
  const next = { ...ctx, state, ...extra };
  saveBootstrapContext(next);
  onChange(next);
  return next;
}

export async function executeBootstrap(
  ctx: BootstrapContext, onChange: (c: BootstrapContext) => void
): Promise<BootstrapContext> {
  const pathname = window.location.pathname;
  if (shouldBypassRedirect(pathname)) {
    logger.info('Bypassing bootstrap', { module: 'bootstrap-state-machine' });
    return transitionTo(
      ctx, BootstrapState.CONFIG_MISSING, onChange,
      { error: `Bootstrap bypassed on route ${pathname}`, errorType: ErrorType.CONFIG }
    );
  }
  const loadingCtx = transitionTo(ctx, BootstrapState.LOADING, onChange, { lastAttempt: new Date().toISOString() });
  logger.info('Starting bootstrap', { module: 'bootstrap-state-machine', retryCount: loadingCtx.retryCount, environment: loadingCtx.environment });

  try {
    const res = await configLoader.loadConfiguration();
    const c = res.config;
    if (c && c.url && c.anonKey) {
      if (!c.url.trim() || !c.anonKey.trim()) {
        logger.warn('Empty config values', { module: 'bootstrap-state-machine', source: res.source });
        clearConfig();
        return transitionTo(loadingCtx, BootstrapState.CONFIG_MISSING, onChange, {
          error: 'Configuration has empty values', errorType: ErrorType.CONFIG, configSource: res.source
        });
      }
      if (!isValidUrl(c.url)) {
        logger.warn('Invalid URL format', { module: 'bootstrap-state-machine', source: res.source, url: c.url });
        clearConfig();
        return transitionTo(loadingCtx, BootstrapState.CONFIG_MISSING, onChange, {
          error: 'Invalid URL format', errorType: ErrorType.CONFIG, configSource: res.source
        });
      }
      const configFoundCtx = transitionTo(loadingCtx, BootstrapState.CONFIG_FOUND, onChange, { configSource: res.source });
      logger.info(`Config found from ${res.source}`, { module: 'bootstrap-state-machine' });
      configLoader.saveConfiguration(c);
      resetSupabaseClient();

      // Client initialization & retry
      (async function retryClientInit(attempt = 1, max = 3) {
        await new Promise(r => setTimeout(r, 500 * attempt));
        try {
          const client = await getSupabaseClient();
          if (client?.auth?.getSession && typeof client.from === 'function') {
            const { error } = await client.auth.getSession();
            if (error && attempt < max) return retryClientInit(attempt + 1, max);
            try { client.from('profiles'); } catch (e) {
              if (attempt < max) return retryClientInit(attempt + 1, max);
            }
          } else if (attempt < max) return retryClientInit(attempt + 1, max);
        } catch {
          if (attempt < max) return retryClientInit(attempt + 1, max);
        }
      })();

      const successCtx = transitionTo(
        configFoundCtx, BootstrapState.CONNECTION_SUCCESS, onChange,
        { lastSuccess: new Date().toISOString(), error: undefined, errorType: undefined }
      );
      setTimeout(() => transitionTo(successCtx, BootstrapState.COMPLETE, onChange), 2000);
      return successCtx;
    }

    if (res.source === ConfigSource.STATIC_FILE) {
      clearConfig();
      logger.info('Static config empty/invalid', { module: 'bootstrap-state-machine', error: res.error });
      return transitionTo(
        loadingCtx, BootstrapState.CONFIG_MISSING, onChange,
        { error: 'Static site config missing or empty', errorType: ErrorType.CONFIG, configSource: res.source }
      );
    }
    logger.warn('No valid config found', { module: 'bootstrap-state-machine', error: res.error, hasConfig: !!c, configSourceIfFound: res.source });
    return transitionTo(
      loadingCtx, BootstrapState.CONFIG_MISSING, onChange,
      { error: res.error || 'No valid config found', errorType: res.error ? determineErrorType(res.error) : ErrorType.CONFIG, retryCount: loadingCtx.retryCount + 1 }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('Unexpected error during bootstrap:', err, { module: 'bootstrap-state-machine' });
    return transitionTo(
      ctx, BootstrapState.CONNECTION_ERROR, onChange, {
        error: errorMsg, errorType: determineErrorType(errorMsg),
        retryCount: ctx.retryCount + 1, lastAttempt: new Date().toISOString()
      }
    );
  }
}

export function resetBootstrap(onChange: (c: BootstrapContext) => void): BootstrapContext {
  const ctx = createDefaultContext();
  saveBootstrapContext(ctx);
  onChange(ctx);
  return ctx;
}