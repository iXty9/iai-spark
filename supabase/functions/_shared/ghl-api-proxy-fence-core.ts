// Fence for the legacy ghl-api-proxy: read-only, short allowlist.
// Typed ghl-* functions (via CMS v2) are the supported path for everything else.

const READ_ALLOWLIST: RegExp[] = [
  /^\/contacts\/?$/i,                     // list/search contacts (GET)
  /^\/contacts\/[A-Za-z0-9]{1,64}\/?$/i,  // one contact
  /^\/locations\/[A-Za-z0-9]{1,64}\/?$/i, // own location details
];

export type FenceDecision = { ok: true } | { ok: false; status: 403 | 400; code: string };

export function fenceProxyRequest(method: unknown, endpoint: unknown): FenceDecision {
  if (typeof endpoint !== 'string' || endpoint.length === 0 || endpoint.length > 300) return { ok: false, status: 400, code: 'BAD_ENDPOINT' };
  const m = typeof method === 'string' ? method.toUpperCase() : 'GET';
  if (m !== 'GET') return { ok: false, status: 403, code: 'PROXY_WRITES_DISABLED' };
  const path = endpoint.split('?')[0];
  if (path.includes('..') || path.includes('//') || /^[a-z]+:/i.test(path)) return { ok: false, status: 400, code: 'BAD_ENDPOINT' };
  if (!READ_ALLOWLIST.some((re) => re.test(path))) return { ok: false, status: 403, code: 'PROXY_ENDPOINT_NOT_ALLOWED' };
  return { ok: true };
}
