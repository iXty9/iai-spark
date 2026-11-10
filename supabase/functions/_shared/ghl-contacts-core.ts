// Pure rules for the contacts tool used by CMS v2 (typed schema_version 1.0).
// Reads: contacts.search, contacts.get, contacts.tasks.list, contacts.tasks.get.
// Writes (need confirmation unless the user turned confirmations off):
//   contacts.create, contacts.upsert, contacts.update, contacts.delete,
//   contacts.tags.add, contacts.tags.remove,
//   contacts.tasks.create, contacts.tasks.update, contacts.tasks.complete, contacts.tasks.delete.
// No I/O here. The sub-account always comes from the server, never the caller.

export const READ_OPERATIONS = ['contacts.search', 'contacts.get', 'contacts.tasks.list', 'contacts.tasks.get'] as const;
export const WRITE_OPERATIONS = [
  'contacts.create', 'contacts.upsert', 'contacts.update', 'contacts.delete',
  'contacts.tags.add', 'contacts.tags.remove',
  'contacts.tasks.create', 'contacts.tasks.update', 'contacts.tasks.complete', 'contacts.tasks.delete',
] as const;
export const HIGH_RISK_OPERATIONS: readonly Operation[] = ['contacts.delete', 'contacts.tasks.delete'];

export type ReadOperation = typeof READ_OPERATIONS[number];
export type WriteOperation = typeof WRITE_OPERATIONS[number];
export type Operation = ReadOperation | WriteOperation;

export interface ContactFields {
  firstName?: string; lastName?: string; name?: string; email?: string; phone?: string; companyName?: string;
  tags?: string[];
}
export interface TaskFields { title?: string; body?: string; dueDate?: string; completed?: boolean }

export type Command =
  | { operation: 'contacts.search'; params: { query: string; page: number; pageLimit: number } }
  | { operation: 'contacts.get' | 'contacts.delete' | 'contacts.tasks.list'; params: { contact_id: string } }
  | { operation: 'contacts.create' | 'contacts.upsert'; params: ContactFields }
  | { operation: 'contacts.update'; params: { contact_id: string } & Omit<ContactFields, 'tags'> }
  | { operation: 'contacts.tags.add' | 'contacts.tags.remove'; params: { contact_id: string; tags: string[] } }
  | { operation: 'contacts.tasks.get' | 'contacts.tasks.delete'; params: { contact_id: string; task_id: string } }
  | { operation: 'contacts.tasks.create'; params: { contact_id: string; title: string; dueDate: string; body?: string; completed?: boolean } }
  | { operation: 'contacts.tasks.update'; params: { contact_id: string; task_id: string } & TaskFields }
  | { operation: 'contacts.tasks.complete'; params: { contact_id: string; task_id: string; completed: boolean } };

export interface ParsedRequest { command: Command; confirmation_id: string | null }

export const CONTACT_ID_RE = /^[A-Za-z0-9]{1,128}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL_RE = /[\x00-\x1f\x7f]/;
const CONTROL_EXCEPT_NEWLINES_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;
const PHONE_RE = /^\+?[0-9 ().-]{3,32}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

const CONTACT_FIELDS = ['id', 'name', 'firstName', 'lastName', 'email', 'phone', 'companyName', 'tags', 'dnd', 'locationId'];
const TASK_FIELDS = ['id', 'title', 'body', 'dueDate', 'completed', 'contactId', 'assignedTo'];

const MESSAGES: Record<string, string> = {
  INVALID_REQUEST: 'The contacts request was not valid.',
  AUTHENTICATION_FAILED: 'The request could not be verified as coming from a signed-in user.',
  NO_CONNECTED_ACCOUNT: 'This user has no connected HighLevel sub-account.',
  ACCESS_DENIED: 'Access to this sub-account was denied.',
  NOT_FOUND: 'The contact or task was not found.',
  RATE_LIMITED: 'HighLevel is rate limiting requests. Try again shortly.',
  UPSTREAM_UNAVAILABLE: 'HighLevel is not available right now.',
  UPSTREAM_REQUEST_REJECTED: 'HighLevel rejected the request.',
  TENANT_MISMATCH: 'HighLevel returned data for a different sub-account.',
  INVALID_RESPONSE: 'HighLevel returned an unexpected response.',
  TRANSPORT_ERROR: 'Could not reach HighLevel.',
  TOKEN_UNAVAILABLE: 'The HighLevel connection could not be used right now.',
  CONFIRMATION_REQUIRED: 'Nothing was changed yet. Show the user data.summary and ask them to confirm. If they confirm in their next message, call again with the same operation and params plus data.confirmation_id.',
  CONFIRMATION_INVALID: 'That confirmation is expired, already used, or does not match this change. Ask the user again.',
};

export interface TypedResult {
  schema_version: '1.0';
  ok: boolean;
  operation: Operation | null;
  request_id: string;
  data: unknown;
  error: null | { code: string; message: string; retryable: boolean; status: number | null };
}

export function isWrite(op: Operation): op is WriteOperation {
  return (WRITE_OPERATIONS as readonly string[]).includes(op);
}

export function failure(operation: Operation | null, requestId: string, code: string, status: number | null, retryable: boolean, data: unknown = null): TypedResult {
  return {
    schema_version: '1.0',
    ok: false,
    operation,
    request_id: requestId,
    data,
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
    case 'CONFIRMATION_REQUIRED':
    case 'CONFIRMATION_INVALID': return 409;
    case 'RATE_LIMITED': return 429;
    case 'TOKEN_UNAVAILABLE': return 503;
    default: return 502;
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function onlyKeys(o: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(o).every((k) => allowed.includes(k));
}

function text(v: unknown, max: number, multiline = false): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max && !(multiline ? CONTROL_EXCEPT_NEWLINES_RE : CONTROL_RE).test(v);
}

function id(v: unknown): v is string {
  return typeof v === 'string' && CONTACT_ID_RE.test(v);
}

function tagList(v: unknown): v is string[] {
  return Array.isArray(v) && v.length >= 1 && v.length <= 20 && v.every((t) => text(t, 64)) && new Set(v).size === v.length;
}

function isoDate(v: unknown): v is string {
  return typeof v === 'string' && ISO_RE.test(v) && !Number.isNaN(Date.parse(v));
}

/** Validate contact fields. Returns null when any field is invalid. */
function parseContactFields(p: Record<string, unknown>, allowTags: boolean): ContactFields | null {
  const out: ContactFields = {};
  for (const k of ['firstName', 'lastName', 'name'] as const) {
    if (k in p) { if (!text(p[k], 100)) return null; out[k] = p[k] as string; }
  }
  if ('companyName' in p) { if (!text(p.companyName, 200)) return null; out.companyName = p.companyName as string; }
  if ('email' in p) { if (typeof p.email !== 'string' || p.email.length > 254 || !EMAIL_RE.test(p.email)) return null; out.email = p.email; }
  if ('phone' in p) { if (typeof p.phone !== 'string' || !PHONE_RE.test(p.phone)) return null; out.phone = p.phone; }
  if ('tags' in p) { if (!allowTags || !tagList(p.tags)) return null; out.tags = p.tags as string[]; }
  return out;
}

/** Validate the tool command. Unknown fields anywhere are rejected. */
export function parseRequest(input: unknown): ParsedRequest | null {
  if (!isPlainObject(input)) return null;
  if (!onlyKeys(input, ['operation', 'params', 'confirmation_id'])) return null;
  let confirmation_id: string | null = null;
  if ('confirmation_id' in input && input.confirmation_id !== null) {
    if (typeof input.confirmation_id !== 'string' || !UUID_RE.test(input.confirmation_id)) return null;
    confirmation_id = input.confirmation_id.toLowerCase();
  }
  const command = parseCommand({ operation: input.operation, params: input.params });
  if (!command) return null;
  if (confirmation_id && !isWrite(command.operation)) return null;
  return { command, confirmation_id };
}

export function parseCommand(input: unknown): Command | null {
  if (!isPlainObject(input)) return null;
  if (!onlyKeys(input, ['operation', 'params'])) return null;
  const { operation, params: p } = input as { operation: unknown; params: unknown };
  if (!isPlainObject(p)) return null;

  switch (operation) {
    case 'contacts.search': {
      if (!onlyKeys(p, ['query', 'page', 'pageLimit'])) return null;
      const q = p.query;
      if (typeof q !== 'string' || !q.trim() || q.length > 75 || CONTROL_RE.test(q)) return null;
      const page = p.page ?? 1;
      const pageLimit = p.pageLimit ?? 20;
      if (!Number.isInteger(page) || (page as number) < 1 || (page as number) > 100) return null;
      if (!Number.isInteger(pageLimit) || (pageLimit as number) < 1 || (pageLimit as number) > 50) return null;
      return { operation, params: { query: q, page: page as number, pageLimit: pageLimit as number } };
    }
    case 'contacts.get':
    case 'contacts.delete':
    case 'contacts.tasks.list': {
      if (!onlyKeys(p, ['contact_id']) || !id(p.contact_id)) return null;
      return { operation, params: { contact_id: p.contact_id } };
    }
    case 'contacts.create':
    case 'contacts.upsert': {
      if (!onlyKeys(p, ['firstName', 'lastName', 'name', 'email', 'phone', 'companyName', 'tags'])) return null;
      const f = parseContactFields(p, true);
      if (!f || !(f.email || f.phone || f.name || f.firstName || f.lastName)) return null;
      if (operation === 'contacts.upsert' && !(f.email || f.phone)) return null;
      return { operation, params: f };
    }
    case 'contacts.update': {
      if (!onlyKeys(p, ['contact_id', 'firstName', 'lastName', 'name', 'email', 'phone', 'companyName']) || !id(p.contact_id)) return null;
      const f = parseContactFields(p, false);
      if (!f || Object.keys(f).length === 0) return null;
      return { operation, params: { contact_id: p.contact_id, ...f } };
    }
    case 'contacts.tags.add':
    case 'contacts.tags.remove': {
      if (!onlyKeys(p, ['contact_id', 'tags']) || !id(p.contact_id) || !tagList(p.tags)) return null;
      return { operation, params: { contact_id: p.contact_id, tags: p.tags } };
    }
    case 'contacts.tasks.get':
    case 'contacts.tasks.delete': {
      if (!onlyKeys(p, ['contact_id', 'task_id']) || !id(p.contact_id) || !id(p.task_id)) return null;
      return { operation, params: { contact_id: p.contact_id, task_id: p.task_id } };
    }
    case 'contacts.tasks.create': {
      if (!onlyKeys(p, ['contact_id', 'title', 'body', 'dueDate', 'completed']) || !id(p.contact_id)) return null;
      if (!text(p.title, 200) || !isoDate(p.dueDate)) return null;
      if ('body' in p && !text(p.body, 2000, true)) return null;
      if ('completed' in p && typeof p.completed !== 'boolean') return null;
      const params: { contact_id: string; title: string; dueDate: string; body?: string; completed?: boolean } = { contact_id: p.contact_id, title: p.title, dueDate: p.dueDate };
      if ('body' in p) params.body = p.body as string;
      if ('completed' in p) params.completed = p.completed as boolean;
      return { operation, params };
    }
    case 'contacts.tasks.update': {
      if (!onlyKeys(p, ['contact_id', 'task_id', 'title', 'body', 'dueDate', 'completed']) || !id(p.contact_id) || !id(p.task_id)) return null;
      const f: TaskFields = {};
      if ('title' in p) { if (!text(p.title, 200)) return null; f.title = p.title as string; }
      if ('body' in p) { if (!text(p.body, 2000, true)) return null; f.body = p.body as string; }
      if ('dueDate' in p) { if (!isoDate(p.dueDate)) return null; f.dueDate = p.dueDate as string; }
      if ('completed' in p) { if (typeof p.completed !== 'boolean') return null; f.completed = p.completed; }
      if (Object.keys(f).length === 0) return null;
      return { operation, params: { contact_id: p.contact_id, task_id: p.task_id, ...f } };
    }
    case 'contacts.tasks.complete': {
      if (!onlyKeys(p, ['contact_id', 'task_id', 'completed']) || !id(p.contact_id) || !id(p.task_id)) return null;
      const completed = p.completed ?? true;
      if (typeof completed !== 'boolean') return null;
      return { operation, params: { contact_id: p.contact_id, task_id: p.task_id, completed } };
    }
    default:
      return null;
  }
}

function without<T extends Record<string, unknown>>(o: T, ...keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (!keys.includes(k)) out[k] = v;
  return out;
}

/** Build the only HighLevel requests this tool may make. Location comes from the server. */
export function buildGhlRequest(cmd: Command, locationId: string): { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string; body?: Record<string, unknown> } {
  switch (cmd.operation) {
    case 'contacts.search':
      return { method: 'POST', path: '/contacts/search', body: { locationId, query: cmd.params.query, page: cmd.params.page, pageLimit: cmd.params.pageLimit } };
    case 'contacts.get':
      return { method: 'GET', path: `/contacts/${cmd.params.contact_id}` };
    case 'contacts.delete':
      return { method: 'DELETE', path: `/contacts/${cmd.params.contact_id}` };
    case 'contacts.create':
      return { method: 'POST', path: '/contacts/', body: { ...cmd.params, locationId } };
    case 'contacts.upsert':
      return { method: 'POST', path: '/contacts/upsert', body: { ...cmd.params, locationId } };
    case 'contacts.update':
      return { method: 'PUT', path: `/contacts/${cmd.params.contact_id}`, body: without(cmd.params, 'contact_id') };
    case 'contacts.tags.add':
      return { method: 'POST', path: `/contacts/${cmd.params.contact_id}/tags`, body: { tags: cmd.params.tags } };
    case 'contacts.tags.remove':
      return { method: 'DELETE', path: `/contacts/${cmd.params.contact_id}/tags`, body: { tags: cmd.params.tags } };
    case 'contacts.tasks.list':
      return { method: 'GET', path: `/contacts/${cmd.params.contact_id}/tasks` };
    case 'contacts.tasks.get':
      return { method: 'GET', path: `/contacts/${cmd.params.contact_id}/tasks/${cmd.params.task_id}` };
    case 'contacts.tasks.delete':
      return { method: 'DELETE', path: `/contacts/${cmd.params.contact_id}/tasks/${cmd.params.task_id}` };
    case 'contacts.tasks.create':
      return { method: 'POST', path: `/contacts/${cmd.params.contact_id}/tasks`, body: { completed: false, ...without(cmd.params, 'contact_id') } };
    case 'contacts.tasks.update':
      return { method: 'PUT', path: `/contacts/${cmd.params.contact_id}/tasks/${cmd.params.task_id}`, body: without(cmd.params, 'contact_id', 'task_id') };
    case 'contacts.tasks.complete':
      return { method: 'PUT', path: `/contacts/${cmd.params.contact_id}/tasks/${cmd.params.task_id}/completed`, body: { completed: cmd.params.completed } };
  }
}

/** Plain-language summary of a write, shown to the user before they confirm. */
export function describeWrite(cmd: Command): string {
  const p = cmd.params as Record<string, unknown>;
  const who = (p.name || [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || p.phone || '') as string;
  const fields = (keys: string[]) => keys.filter((k) => k in p).map((k) => `${k}: ${p[k]}`).join(', ');
  switch (cmd.operation) {
    case 'contacts.create': return `Create a new contact ${who}${p.tags ? ` with tags ${(p.tags as string[]).join(', ')}` : ''}.`;
    case 'contacts.upsert': return `Create or update the contact matching ${p.email || p.phone} (${fields(['firstName', 'lastName', 'name', 'companyName'])}).`;
    case 'contacts.update': return `Update contact ${p.contact_id}: ${fields(['firstName', 'lastName', 'name', 'email', 'phone', 'companyName'])}.`;
    case 'contacts.delete': return `PERMANENTLY DELETE contact ${p.contact_id}. This cannot be undone.`;
    case 'contacts.tags.add': return `Add tags ${(p.tags as string[]).join(', ')} to contact ${p.contact_id}.`;
    case 'contacts.tags.remove': return `Remove tags ${(p.tags as string[]).join(', ')} from contact ${p.contact_id}.`;
    case 'contacts.tasks.create': return `Create task "${p.title}" due ${p.dueDate} for contact ${p.contact_id}.`;
    case 'contacts.tasks.update': return `Update task ${p.task_id} on contact ${p.contact_id}: ${fields(['title', 'body', 'dueDate', 'completed'])}.`;
    case 'contacts.tasks.complete': return `Mark task ${p.task_id} on contact ${p.contact_id} as ${p.completed ? 'completed' : 'not completed'}.`;
    case 'contacts.tasks.delete': return `PERMANENTLY DELETE task ${p.task_id} on contact ${p.contact_id}.`;
    default: return `Read ${cmd.operation}.`;
  }
}

function project(obj: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of fields) if (Object.prototype.hasOwnProperty.call(obj, key)) out[key] = obj[key];
  return out;
}

function ok(op: Operation, requestId: string, data: unknown): TypedResult {
  return { schema_version: '1.0', ok: true, operation: op, request_id: requestId, error: null, data };
}

/** Check a contact object from HighLevel belongs to our sub-account. */
function contactResult(op: Operation, requestId: string, status: number, contact: unknown, locationId: string, expectId?: string): TypedResult {
  if (!isPlainObject(contact) || !id(contact.id) || (expectId && contact.id !== expectId)) return failure(op, requestId, 'INVALID_RESPONSE', status, false);
  if (contact.locationId !== locationId) return failure(op, requestId, 'TENANT_MISMATCH', status, false);
  return ok(op, requestId, { contact: project(contact, CONTACT_FIELDS) });
}

function taskOk(task: unknown, contactId: string, expectId?: string): task is Record<string, unknown> {
  if (!isPlainObject(task) || !id(task.id) || (expectId && task.id !== expectId)) return false;
  return task.contactId === undefined || task.contactId === contactId;
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
  const p = cmd.params as Record<string, any>;

  switch (cmd.operation) {
    case 'contacts.search': {
      const list = body.contacts;
      if (!Array.isArray(list)) return failure(op, requestId, 'INVALID_RESPONSE', status, false);
      if (list.some((c) => !isPlainObject(c) || !id(c.id))) return failure(op, requestId, 'INVALID_RESPONSE', status, false);
      if (list.some((c: any) => c.locationId !== locationId)) return failure(op, requestId, 'TENANT_MISMATCH', status, false);
      const rawTotal = body.total as number;
      const total = Number.isInteger(rawTotal) && rawTotal >= 0 ? rawTotal : null;
      if (list.length > cmd.params.pageLimit || new Set(list.map((c: any) => c.id)).size !== list.length || (total !== null && total < list.length)) {
        return failure(op, requestId, 'INVALID_RESPONSE', status, false);
      }
      const contacts = list.map((c: any) => project(c, CONTACT_FIELDS));
      const { page, pageLimit } = cmd.params;
      return ok(op, requestId, { contacts, returned_count: contacts.length, total, page, page_limit: pageLimit, has_more: total === null ? null : page * pageLimit < total });
    }
    case 'contacts.get':
    case 'contacts.update':
      return contactResult(op, requestId, status, body.contact, locationId, p.contact_id);
    case 'contacts.create':
      return contactResult(op, requestId, status, body.contact, locationId);
    case 'contacts.upsert': {
      const r = contactResult(op, requestId, status, body.contact, locationId);
      if (r.ok) (r.data as Record<string, unknown>).created = body.new === true;
      return r;
    }
    case 'contacts.delete':
      return ok(op, requestId, { deleted: true, contact_id: p.contact_id });
    case 'contacts.tags.add':
    case 'contacts.tags.remove': {
      const tags = Array.isArray(body.tags) && body.tags.every((t: unknown) => typeof t === 'string') ? body.tags : null;
      return ok(op, requestId, { contact_id: p.contact_id, tags });
    }
    case 'contacts.tasks.list': {
      const list = body.tasks;
      if (!Array.isArray(list) || list.length > 500 || list.some((t) => !taskOk(t, p.contact_id))) return failure(op, requestId, 'INVALID_RESPONSE', status, false);
      return ok(op, requestId, { contact_id: p.contact_id, tasks: list.map((t: any) => project(t, TASK_FIELDS)) });
    }
    case 'contacts.tasks.get':
    case 'contacts.tasks.update':
    case 'contacts.tasks.complete':
    case 'contacts.tasks.create': {
      const expect = cmd.operation === 'contacts.tasks.create' ? undefined : p.task_id;
      if (!taskOk(body.task, p.contact_id, expect)) return failure(op, requestId, 'INVALID_RESPONSE', status, false);
      return ok(op, requestId, { task: project(body.task, TASK_FIELDS) });
    }
    case 'contacts.tasks.delete':
      return ok(op, requestId, { deleted: true, contact_id: p.contact_id, task_id: p.task_id });
  }
}
