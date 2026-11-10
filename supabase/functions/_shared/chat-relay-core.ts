// Pure rules for chat-relay: which n8n address may be called and with which headers.

export interface RelaySettings {
  authenticated_webhook_url?: string;
  anonymous_webhook_url?: string;
  authenticated_webhook_url_use_auth?: string;
  webhook_auth_header_name?: string;
  webhook_auth_header_value?: string;
  webhook_timeout?: string;
}

export interface RelayProfile {
  webhook_url: string | null;
  custom_webhook_enabled: boolean | null;
  custom_webhook_use_auth: boolean | null;
  custom_webhook_auth_header_name: string | null;
  custom_webhook_auth_header_value: string | null;
}

export const MAX_RELAY_TIMEOUT_MS = 140_000;
const HEADER_NAME_RE = /^[A-Za-z0-9-]{1,64}$/;

function parseHttps(raw: string | null | undefined): URL | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    return u;
  } catch {
    return null;
  }
}

/** Hosts the relay may call: only the hosts of the admin-configured global chat addresses. */
export function allowedHosts(settings: RelaySettings): Set<string> {
  const hosts = new Set<string>();
  for (const raw of [settings.authenticated_webhook_url, settings.anonymous_webhook_url]) {
    const u = parseHttps(raw);
    if (u) hosts.add(u.hostname.toLowerCase());
  }
  return hosts;
}

/** A target is allowed only if https, default port, no credentials, an allowed host and a /webhook/ path. */
export function isAllowedTarget(raw: string | null | undefined, hosts: Set<string>): boolean {
  const u = parseHttps(raw);
  if (!u) return false;
  if (!hosts.has(u.hostname.toLowerCase())) return false;
  return u.pathname.startsWith('/webhook/');
}

export type Resolution =
  | { ok: true; url: string; isCustom: boolean; authHeaders: Record<string, string> }
  | { ok: false; reason: 'no_target' | 'target_not_allowed' };

/** Pick the n8n address and auth header on the server. Never trusts the browser. */
export function resolveTarget(settings: RelaySettings, profile: RelayProfile | null): Resolution {
  const hosts = allowedHosts(settings);

  if (profile?.custom_webhook_enabled && profile.webhook_url) {
    if (!isAllowedTarget(profile.webhook_url, hosts)) return { ok: false, reason: 'target_not_allowed' };
    const headers: Record<string, string> = {};
    const name = profile.custom_webhook_auth_header_name;
    const value = profile.custom_webhook_auth_header_value;
    if (profile.custom_webhook_use_auth && name && value && HEADER_NAME_RE.test(name)) headers[name] = value;
    return { ok: true, url: profile.webhook_url.trim(), isCustom: true, authHeaders: headers };
  }

  const global = settings.authenticated_webhook_url;
  if (!global) return { ok: false, reason: 'no_target' };
  if (!isAllowedTarget(global, hosts)) return { ok: false, reason: 'target_not_allowed' };
  const headers: Record<string, string> = {};
  if (settings.authenticated_webhook_url_use_auth === 'true' && settings.webhook_auth_header_value) {
    const name = settings.webhook_auth_header_name || 'X-Webhook-Token';
    if (HEADER_NAME_RE.test(name)) headers[name] = settings.webhook_auth_header_value;
  }
  return { ok: true, url: global.trim(), isCustom: false, authHeaders: headers };
}

export function relayTimeoutMs(raw: string | undefined): number {
  const n = parseInt(raw || '', 10);
  if (!Number.isFinite(n) || n <= 0) return MAX_RELAY_TIMEOUT_MS;
  return Math.min(n, MAX_RELAY_TIMEOUT_MS);
}
