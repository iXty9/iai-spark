// Pure rules for the contacts read tool (contacts.search / contacts.get).
// Mirrors the CMS v2 typed contract (schema_version 1.0). No I/O here.

export type Operation = 'contacts.search' | 'contacts.get';

export type Command =
  | { operation: 'contacts.search'; params: { query: string; page: number; pageLimit: number } }
  | { operation: 'contacts.get'; params: { contact_id: string } };

export const CONTACT_ID_RE = /^[A-Za-z0-9]{1,128}$/;
const CONTROL_RE = /[\x00-\x1f\x7f]/;
const PROJECTED_FIELDS = ['id', 'name', 'firstName', 'lastName', 'email', 'phone', 'companyName', 'tags', 'dnd', 'locationId'];

const MESSAGES: Record<string, string> = {
  INVALID_REQUEST: 'The contacts request was not valid.',
  AUTHENTICATION_FAILED: 'The request could not be verified as coming from a signed-in user.',
  NO_CONNECTED_ACCOUNT: 'This user has no connected HighLevel sub-account.',
  ACCESS_DENIED: 'Access to this sub-account was denied.',
  NOT_FOUND: 'The contact was not found.',
  RATE_LIMITED: 'HighLevel is rate limiting requests. Try again shortly.',
  UPSTREAM_UNAVAILABLE: 'HighLevel is not available right now.',
  UPSTREAM_REQUEST_REJECTED: 'HighLevel rejected the request.',
  TENANT_MISMATCH: 'HighLevel returned data for a different sub-account.',
  INVALID_RESPONSE: 'HighLevel returned an unexpected response.',
  TRANSPORT_ERROR: 'Could not reach HighLevel.',
  TOKEN_UNAVAILABLE: 'The HighLevel connection could not be used right now.',
};

export interface TypedResult {
  schema_version: '1.0';
  ok: boolean;
  operation: Operation | null;
  request_id: string;
  data: unknown;
  error: null | { code: string; message: string; retryable: boolean; status: number | null };
}

export function failure(operation: Operation | null, requestId: string, code: string, status: number | null, retryable: boolean): TypedResult {
  return {
    schema_version: '1.0',
    ok: false,
    operation,
    request_id: requestId,
    data: null,
    error: { code, message: MESSAGES[code] || 'CRM operation failed.', retryable, status },
  };
}

/** HTTP status the edge function should answer with for a typed failure code. */
export function httpStatusFor(code: string): number {
  switch (code) {
    case 'INVALID_REQUEST': return 400;
    case 'AUTHENTICATION_FAILED': return 401;
    case 'NO_CONNECTED_ACCOUNT':
    case 'ACCESS_DENIED': return 403;
    case 'NOT_FOUND': return 404;
    case 'RATE_LIMITED': return 429;
    case 'TOKEN_UNAVAILABLE': return 503;
    default: return 502;
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** Validate the tool command. Unknown fields anywhere are rejected. */
export function parseCommand(input: unknown): Command | null {
  if (!isPlainObject(input)) return null;
  if (Object.keys(input).some((k) => k !== 'operation' && k !== 'params')) return null;
  const { operation, params } = input as { operation: unknown; params: unknown };
  if (!isPlainObject(params)) return null;

  if (operation === 'contacts.search') {
    if (Object.keys(params).some((k) => !['query', 'page', 'pageLimit'].includes(k))) return null;
    const q = params.query;
    if (typeof q !== 'string' || !q.trim() || q.length > 75 || CONTROL_RE.test(q)) return null;
    const page = params.page ?? 1;
    const pageLimit = params.pageLimit ?? 20;
    if (!Number.isInteger(page) || (page as number) < 1 || (page as number) > 100) return null;
    if (!Number.isInteger(pageLimit) || (pageLimit as number) < 1 || (pageLimit as number) > 50) return null;
    return { operation, params: { query: q, page: page as number, pageLimit: pageLimit as number } };
  }
  if (operation === 'contacts.get') {
    if (Object.keys(params).some((k) => k !== 'contact_id')) return null;
    const id = params.contact_id;
    if (typeof id !== 'string' || !CONTACT_ID_RE.test(id)) return null;
    return { operation, params: { contact_id: id } };
  }
  return null;
}

/** Build the only two HighLevel requests this tool may make. Location comes from the server. */
export function buildGhlRequest(cmd: Command, locationId: string): { method: 'GET' | 'POST'; path: string; body?: Record<string, unknown> } {
  if (cmd.operation === 'contacts.get') {
    return { method: 'GET', path: `/contacts/${cmd.params.contact_id}` };
  }
  return {
    method: 'POST',
    path: '/contacts/search',
    body: { locationId, query: cmd.params.query, page: cmd.params.page, pageLimit: cmd.params.pageLimit },
  };
}

function projectContact(contact: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PROJECTED_FIELDS) if (Object.prototype.hasOwnProperty.call(contact, key)) out[key] = contact[key];
  return out;
}

/** Turn a HighLevel response into the typed result. Fails closed. */
export function normalizeResponse(status: number, body: any, cmd: Command, locationId: string, requestId: string): TypedResult {
  const op = cmd.operation;
  if (!Number.isInteger(status) || status < 100 || status > 599) return failure(op, requestId, 'TRANSPORT_ERROR', null, true);
  if (status < 200 || status >= 300) {
    const code = status === 401 ? 'AUTHENTICATION_FAILED'
      : status === 403 ? 'ACCESS_DENIED'
      : status === 404 ? 'NOT_FOUND'
      : status === 429 ? 'RATE_LIMITED'
      : status >= 500 ? 'UPSTREAM_UNAVAILABLE'
      : 'UPSTREAM_REQUEST_REJECTED';
    return failure(op, requestId, code, status, status === 429 || status >= 500);
  }
  if (!isPlainObject(body) || body.success === false || body.error) return failure(op, requestId, 'INVALID_RESPONSE', status, false);

  if (cmd.operation === 'contacts.search') {
    const list = body.contacts;
    if (!Array.isArray(list)) return failure(op, requestId, 'INVALID_RESPONSE', status, false);
    if (list.some((c) => !isPlainObject(c) || typeof c.id !== 'string' || !CONTACT_ID_RE.test(c.id))) {
      return failure(op, requestId, 'INVALID_RESPONSE', status, false);
    }
    if (list.some((c: any) => c.locationId !== locationId)) return failure(op, requestId, 'TENANT_MISMATCH', status, false);
    const total = Number.isInteger(body.total) && body.total >= 0 ? body.total as number : null;
    if (list.length > cmd.params.pageLimit || new Set(list.map((c: any) => c.id)).size !== list.length || (total !== null && total < list.length)) {
      return failure(op, requestId, 'INVALID_RESPONSE', status, false);
    }
    const contacts = list.map((c: any) => projectContact(c));
    const { page, pageLimit } = cmd.params;
    return {
      schema_version: '1.0', ok: true, operation: op, request_id: requestId, error: null,
      data: { contacts, returned_count: contacts.length, total, page, page_limit: pageLimit, has_more: total === null ? null : page * pageLimit < total },
    };
  }

  const contact = body.contact;
  if (!isPlainObject(contact) || contact.id !== cmd.params.contact_id) return failure(op, requestId, 'INVALID_RESPONSE', status, false);
  if (contact.locationId !== locationId) return failure(op, requestId, 'TENANT_MISMATCH', status, false);
  return { schema_version: '1.0', ok: true, operation: op, request_id: requestId, error: null, data: { contact: projectContact(contact) } };
}
