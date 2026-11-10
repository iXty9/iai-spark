// Pure rules for the conversations tool (typed schema_version 1.0). No I/O.
// Reads: conversations.search, conversations.get, conversations.messages.list
// Writes: conversations.create, conversations.update, conversations.delete,
//         conversations.messages.send (high risk: reaches the customer).

export const READ_OPERATIONS = ['conversations.search', 'conversations.get', 'conversations.messages.list'] as const;
export const WRITE_OPERATIONS = ['conversations.create', 'conversations.update', 'conversations.delete', 'conversations.messages.send'] as const;
export const HIGH_RISK_OPERATIONS: readonly string[] = ['conversations.delete', 'conversations.messages.send'];
export const MESSAGE_TYPES = ['SMS', 'Email', 'WhatsApp', 'FB', 'IG', 'Live_Chat', 'Custom'] as const;

export type Operation = typeof READ_OPERATIONS[number] | typeof WRITE_OPERATIONS[number];
type MessageType = typeof MESSAGE_TYPES[number];

export type Command =
  | { operation: 'conversations.search'; params: { contact_id?: string; query?: string; limit: number } }
  | { operation: 'conversations.get' | 'conversations.delete'; params: { conversation_id: string } }
  | { operation: 'conversations.messages.list'; params: { conversation_id: string; limit: number } }
  | { operation: 'conversations.create'; params: { contact_id: string } }
  | { operation: 'conversations.update'; params: { conversation_id: string; starred?: boolean; unreadCount?: number } }
  | { operation: 'conversations.messages.send'; params: { contact_id: string; type: MessageType; message: string; subject?: string } };

export interface ParsedRequest { command: Command; confirmation_id: string | null }

const ID_RE = /^[A-Za-z0-9]{1,128}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL_RE = /[\x00-\x1f\x7f]/;
const CONTROL_EXCEPT_NEWLINES_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;
const CONVERSATION_FIELDS = ['id', 'contactId', 'locationId', 'fullName', 'contactName', 'email', 'phone', 'lastMessageBody', 'lastMessageType', 'lastMessageDate', 'unreadCount', 'starred', 'type'];
const MESSAGE_FIELDS = ['id', 'conversationId', 'contactId', 'locationId', 'direction', 'status', 'messageType', 'type', 'body', 'dateAdded'];

export function isWrite(op: Operation): boolean {
  return (WRITE_OPERATIONS as readonly string[]).includes(op);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
const onlyKeys = (o: Record<string, unknown>, allowed: string[]) => Object.keys(o).every((k) => allowed.includes(k));
const id = (v: unknown): v is string => typeof v === 'string' && ID_RE.test(v);
const limitOf = (v: unknown, def: number, max: number): number | null => {
  const n = v ?? def;
  return Number.isInteger(n) && (n as number) >= 1 && (n as number) <= max ? (n as number) : null;
};

export function parseRequest(input: unknown): ParsedRequest | null {
  if (!isPlainObject(input) || !onlyKeys(input, ['operation', 'params', 'confirmation_id'])) return null;
  let confirmation_id: string | null = null;
  if ('confirmation_id' in input && input.confirmation_id !== null) {
    if (typeof input.confirmation_id !== 'string' || !UUID_RE.test(input.confirmation_id)) return null;
    confirmation_id = input.confirmation_id.toLowerCase();
  }
  const command = parseCommand({ operation: input.operation, params: input.params });
  if (!command || (confirmation_id && !isWrite(command.operation))) return null;
  return { command, confirmation_id };
}

export function parseCommand(input: unknown): Command | null {
  if (!isPlainObject(input) || !onlyKeys(input, ['operation', 'params'])) return null;
  const { operation, params: p } = input as { operation: unknown; params: unknown };
  if (!isPlainObject(p)) return null;
  switch (operation) {
    case 'conversations.search': {
      if (!onlyKeys(p, ['contact_id', 'query', 'limit'])) return null;
      const limit = limitOf(p.limit, 20, 100);
      if (limit === null) return null;
      const out: { contact_id?: string; query?: string; limit: number } = { limit };
      if ('contact_id' in p) { if (!id(p.contact_id)) return null; out.contact_id = p.contact_id; }
      if ('query' in p) {
        if (typeof p.query !== 'string' || !p.query.trim() || p.query.length > 75 || CONTROL_RE.test(p.query)) return null;
        out.query = p.query;
      }
      return { operation, params: out };
    }
    case 'conversations.get':
    case 'conversations.delete':
      if (!onlyKeys(p, ['conversation_id']) || !id(p.conversation_id)) return null;
      return { operation, params: { conversation_id: p.conversation_id } };
    case 'conversations.messages.list': {
      if (!onlyKeys(p, ['conversation_id', 'limit']) || !id(p.conversation_id)) return null;
      const limit = limitOf(p.limit, 20, 100);
      if (limit === null) return null;
      return { operation, params: { conversation_id: p.conversation_id, limit } };
    }
    case 'conversations.create':
      if (!onlyKeys(p, ['contact_id']) || !id(p.contact_id)) return null;
      return { operation, params: { contact_id: p.contact_id } };
    case 'conversations.update': {
      if (!onlyKeys(p, ['conversation_id', 'starred', 'unreadCount']) || !id(p.conversation_id)) return null;
      const out: { conversation_id: string; starred?: boolean; unreadCount?: number } = { conversation_id: p.conversation_id };
      if ('starred' in p) { if (typeof p.starred !== 'boolean') return null; out.starred = p.starred; }
      if ('unreadCount' in p) { if (!Number.isInteger(p.unreadCount) || (p.unreadCount as number) < 0 || (p.unreadCount as number) > 10000) return null; out.unreadCount = p.unreadCount as number; }
      if (Object.keys(out).length === 1) return null;
      return { operation, params: out };
    }
    case 'conversations.messages.send': {
      if (!onlyKeys(p, ['contact_id', 'type', 'message', 'subject']) || !id(p.contact_id)) return null;
      if (!(MESSAGE_TYPES as readonly unknown[]).includes(p.type)) return null;
      if (typeof p.message !== 'string' || !p.message.trim() || p.message.length > 5000 || CONTROL_EXCEPT_NEWLINES_RE.test(p.message)) return null;
      const out: { contact_id: string; type: MessageType; message: string; subject?: string } = { contact_id: p.contact_id, type: p.type as MessageType, message: p.message };
      if ('subject' in p) {
        if (p.type !== 'Email' || typeof p.subject !== 'string' || !p.subject.trim() || p.subject.length > 200 || CONTROL_RE.test(p.subject)) return null;
        out.subject = p.subject;
      }
      if (p.type === 'Email' && !out.subject) return null;
      return { operation, params: out };
    }
    default:
      return null;
  }
}

export function buildGhlRequest(cmd: Command, locationId: string): { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string; body?: Record<string, unknown> } {
  switch (cmd.operation) {
    case 'conversations.search': {
      const q = new URLSearchParams({ locationId, limit: String(cmd.params.limit) });
      if (cmd.params.contact_id) q.set('contactId', cmd.params.contact_id);
      if (cmd.params.query) q.set('query', cmd.params.query);
      return { method: 'GET', path: `/conversations/search?${q.toString()}` };
    }
    case 'conversations.get':
      return { method: 'GET', path: `/conversations/${cmd.params.conversation_id}` };
    case 'conversations.delete':
      return { method: 'DELETE', path: `/conversations/${cmd.params.conversation_id}` };
    case 'conversations.messages.list':
      return { method: 'GET', path: `/conversations/${cmd.params.conversation_id}/messages?limit=${cmd.params.limit}` };
    case 'conversations.create':
      return { method: 'POST', path: '/conversations/', body: { locationId, contactId: cmd.params.contact_id } };
    case 'conversations.update': {
      const { conversation_id, ...rest } = cmd.params;
      return { method: 'PUT', path: `/conversations/${conversation_id}`, body: { locationId, ...rest } };
    }
    case 'conversations.messages.send': {
      const body: Record<string, unknown> = { type: cmd.params.type, contactId: cmd.params.contact_id, message: cmd.params.message };
      if (cmd.params.subject) { body.subject = cmd.params.subject; body.html = cmd.params.message; }
      return { method: 'POST', path: '/conversations/messages', body };
    }
  }
}

/** Which requests need us to first prove the target belongs to our sub-account. */
export function ownershipCheck(cmd: Command): { kind: 'contact' | 'conversation'; id: string } | null {
  switch (cmd.operation) {
    case 'conversations.create':
    case 'conversations.messages.send':
      return { kind: 'contact', id: cmd.params.contact_id };
    case 'conversations.update':
    case 'conversations.delete':
    case 'conversations.messages.list':
      return { kind: 'conversation', id: cmd.params.conversation_id };
    default:
      return null;
  }
}

export function describeWrite(cmd: Command, recipient?: string): string {
  const p = cmd.params as Record<string, any>;
  switch (cmd.operation) {
    case 'conversations.create': return `Start a new conversation with contact ${recipient || p.contact_id}.`;
    case 'conversations.update': return `Update conversation ${p.conversation_id}: ${Object.entries(p).filter(([k]) => k !== 'conversation_id').map(([k, v]) => `${k}: ${v}`).join(', ')}.`;
    case 'conversations.delete': return `PERMANENTLY DELETE conversation ${p.conversation_id} and its message history.`;
    case 'conversations.messages.send':
      return `SEND ${p.type} to ${recipient || `contact ${p.contact_id}`}${p.subject ? ` with subject "${p.subject}"` : ''}. The customer will receive this message:\n"""\n${p.message}\n"""`;
    default: return `Read ${cmd.operation}.`;
  }
}

/** Label for the recipient in summaries, from a verified contact record. */
export function recipientLabel(contact: Record<string, unknown>, type?: string): string {
  const name = (contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'contact') as string;
  const addr = type === 'Email' ? contact.email : type === 'SMS' || type === 'WhatsApp' ? contact.phone : null;
  return addr ? `${name} (${addr})` : name;
}

function project(o: Record<string, unknown>, fields: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of fields) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = o[k];
  return out;
}

export type Normalized =
  | { ok: true; data: unknown }
  | { ok: false; code: string; retryable: boolean; status: number | null };

export function normalizeResponse(status: number, body: any, cmd: Command, locationId: string): Normalized {
  if (!Number.isInteger(status) || status < 100 || status > 599) return { ok: false, code: 'TRANSPORT_ERROR', retryable: true, status: null };
  if (status < 200 || status >= 300) {
    const code = status === 401 ? 'AUTHENTICATION_FAILED' : status === 403 ? 'ACCESS_DENIED' : status === 404 ? 'NOT_FOUND'
      : status === 429 ? 'RATE_LIMITED' : status >= 500 ? 'UPSTREAM_UNAVAILABLE' : 'UPSTREAM_REQUEST_REJECTED';
    return { ok: false, code, retryable: status === 429 || status >= 500, status };
  }
  const bad = { ok: false as const, code: 'INVALID_RESPONSE', retryable: false, status };
  const tenant = { ok: false as const, code: 'TENANT_MISMATCH', retryable: false, status };
  if (!isPlainObject(body) || body.success === false || body.error) return bad;
  const p = cmd.params as Record<string, any>;
  switch (cmd.operation) {
    case 'conversations.search': {
      const list = body.conversations;
      if (!Array.isArray(list) || list.length > cmd.params.limit || list.some((c) => !isPlainObject(c) || !id(c.id))) return bad;
      if (list.some((c: any) => c.locationId !== locationId)) return tenant;
      if (cmd.params.contact_id && list.some((c: any) => c.contactId !== cmd.params.contact_id)) return bad;
      return { ok: true, data: { conversations: list.map((c: any) => project(c, CONVERSATION_FIELDS)), total: Number.isInteger(body.total) ? body.total : null } };
    }
    case 'conversations.get': {
      const c = isPlainObject(body.conversation) ? body.conversation : body;
      if (!id(c.id) || c.id !== p.conversation_id) return bad;
      if (c.locationId !== locationId) return tenant;
      return { ok: true, data: { conversation: project(c, CONVERSATION_FIELDS) } };
    }
    case 'conversations.messages.list': {
      const wrap = isPlainObject(body.messages) ? body.messages : body;
      const list = (wrap as any).messages;
      if (!Array.isArray(list) || list.some((m) => !isPlainObject(m) || !id(m.id))) return bad;
      if (list.some((m: any) => m.conversationId !== undefined && m.conversationId !== p.conversation_id)) return bad;
      if (list.some((m: any) => m.locationId !== undefined && m.locationId !== locationId)) return tenant;
      return { ok: true, data: { conversation_id: p.conversation_id, messages: list.slice(0, cmd.params.limit).map((m: any) => project(m, MESSAGE_FIELDS)), has_more: (wrap as any).nextPage === true } };
    }
    case 'conversations.create': {
      const c = body.conversation;
      if (!isPlainObject(c) || !id(c.id)) return bad;
      if (c.locationId !== undefined && c.locationId !== locationId) return tenant;
      return { ok: true, data: { conversation: project(c, CONVERSATION_FIELDS) } };
    }
    case 'conversations.update':
      return { ok: true, data: { conversation_id: p.conversation_id, updated: true } };
    case 'conversations.delete':
      return { ok: true, data: { conversation_id: p.conversation_id, deleted: true } };
    case 'conversations.messages.send':
      if (body.messageId !== undefined && !id(body.messageId)) return bad;
      return { ok: true, data: { sent: true, contact_id: p.contact_id, conversation_id: id(body.conversationId) ? body.conversationId : null, message_id: id(body.messageId) ? body.messageId : null } };
  }
}
