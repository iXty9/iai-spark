// Pure rules for the invoices tool (typed schema_version 1.0). No I/O.
// altId/altType always come from the server (the user's own sub-account).
export const READ_OPERATIONS = ['invoices.list', 'invoices.get', 'invoices.settings'] as const;
export const WRITE_OPERATIONS = ['invoices.create', 'invoices.update', 'invoices.send', 'invoices.void', 'invoices.record_payment', 'invoices.delete'] as const;
export const HIGH_RISK_OPERATIONS: readonly string[] = ['invoices.send', 'invoices.void', 'invoices.record_payment', 'invoices.delete'];
export const STATUSES = ['draft', 'sent', 'payment_processing', 'paid', 'void', 'partially_paid'] as const;
export const SEND_ACTIONS = ['email', 'sms', 'sms_and_email'] as const;
export const PAYMENT_MODES = ['cash', 'card', 'cheque', 'bank_transfer', 'other'] as const;
export const MAX_ITEMS = 50;
export const MAX_AMOUNT = 10_000_000;

export type Operation = typeof READ_OPERATIONS[number] | typeof WRITE_OPERATIONS[number];
export interface Item { name: string; amount: number; qty: number; description?: string }

export type Command =
  | { operation: 'invoices.list'; params: { limit: number; offset: number; status?: typeof STATUSES[number] } }
  | { operation: 'invoices.settings'; params: Record<string, never> }
  | { operation: 'invoices.get' | 'invoices.void' | 'invoices.delete'; params: { invoice_id: string } }
  | { operation: 'invoices.create'; params: { contact_id: string; name: string; currency: string; issueDate: string; dueDate?: string; title?: string; items: Item[] } }
  | { operation: 'invoices.update'; params: { invoice_id: string; name?: string; dueDate?: string; title?: string; items?: Item[] } }
  | { operation: 'invoices.send'; params: { invoice_id: string; action: typeof SEND_ACTIONS[number] } }
  | { operation: 'invoices.record_payment'; params: { invoice_id: string; mode: typeof PAYMENT_MODES[number]; amount?: number; notes?: string } };

const ID_RE = /^[A-Za-z0-9]{1,128}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_RE = /^[A-Z]{3}$/;
const CONTROL_RE = /[\x00-\x1f\x7f]/;
export const INVOICE_FIELDS = ['_id', 'invoiceNumber', 'name', 'title', 'status', 'currency', 'total', 'amountPaid', 'amountDue', 'issueDate', 'dueDate', 'contactDetails', 'items', 'altId'];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const onlyKeys = (o: Record<string, unknown>, k: string[]) => Object.keys(o).every((x) => k.includes(x));
const id = (v: unknown): v is string => typeof v === 'string' && ID_RE.test(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && !!v.trim() && v.length <= max && !CONTROL_RE.test(v);
const date = (v: unknown): v is string => typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));
const money = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= MAX_AMOUNT && Math.round(v * 100) === v * 100;

export const isWrite = (op: string) => (WRITE_OPERATIONS as readonly string[]).includes(op);
export const isHighRisk = (op: string) => HIGH_RISK_OPERATIONS.includes(op);

function items(v: unknown): Item[] | null {
  if (!Array.isArray(v) || v.length < 1 || v.length > MAX_ITEMS) return null;
  const out: Item[] = [];
  for (const it of v) {
    if (!isObj(it) || !onlyKeys(it, ['name', 'amount', 'qty', 'description'])) return null;
    if (!text(it.name, 200) || !money(it.amount)) return null;
    const qty = it.qty ?? 1;
    if (!Number.isInteger(qty) || (qty as number) < 1 || (qty as number) > 10_000) return null;
    const item: Item = { name: it.name, amount: it.amount, qty: qty as number };
    if ('description' in it) { if (!text(it.description, 1000)) return null; item.description = it.description as string; }
    out.push(item);
  }
  return out;
}

export function itemsTotal(list: Item[]): number {
  return Math.round(list.reduce((s, i) => s + i.amount * i.qty, 0) * 100) / 100;
}

export function parseRequest(input: unknown): { command: Command; confirmation_id: string | null } | null {
  if (!isObj(input) || !onlyKeys(input, ['operation', 'params', 'confirmation_id'])) return null;
  let confirmation_id: string | null = null;
  if ('confirmation_id' in input && input.confirmation_id !== null) {
    if (typeof input.confirmation_id !== 'string' || !UUID_RE.test(input.confirmation_id)) return null;
    confirmation_id = input.confirmation_id.toLowerCase();
  }
  const command = parseCommand(input.operation, input.params);
  if (!command || (confirmation_id && !isWrite(command.operation))) return null;
  return { command, confirmation_id };
}

export function parseCommand(operation: unknown, p: unknown): Command | null {
  if (!isObj(p)) return null;
  switch (operation) {
    case 'invoices.list': {
      if (!onlyKeys(p, ['limit', 'offset', 'status'])) return null;
      const limit = p.limit ?? 20, offset = p.offset ?? 0;
      if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 100) return null;
      if (!Number.isInteger(offset) || (offset as number) < 0 || (offset as number) > 100_000) return null;
      const out: any = { limit, offset };
      if ('status' in p) { if (!(STATUSES as readonly unknown[]).includes(p.status)) return null; out.status = p.status; }
      return { operation, params: out };
    }
    case 'invoices.settings':
      // Takes no options; stray extras are dropped (location comes from the server).
      return { operation, params: {} };
    case 'invoices.get':
    case 'invoices.void':
    case 'invoices.delete':
      return onlyKeys(p, ['invoice_id']) && id(p.invoice_id) ? { operation, params: { invoice_id: p.invoice_id } } : null;
    case 'invoices.create': {
      if (!onlyKeys(p, ['contact_id', 'name', 'currency', 'issueDate', 'dueDate', 'title', 'items']) || !id(p.contact_id)) return null;
      if (!text(p.name, 200) || typeof p.currency !== 'string' || !CURRENCY_RE.test(p.currency) || !date(p.issueDate)) return null;
      const list = items(p.items);
      if (!list) return null;
      const out: any = { contact_id: p.contact_id, name: p.name, currency: p.currency, issueDate: p.issueDate, items: list };
      if ('dueDate' in p) { if (!date(p.dueDate) || (p.dueDate as string) < (p.issueDate as string)) return null; out.dueDate = p.dueDate; }
      if ('title' in p) { if (!text(p.title, 200)) return null; out.title = p.title; }
      return { operation, params: out };
    }
    case 'invoices.update': {
      if (!onlyKeys(p, ['invoice_id', 'name', 'dueDate', 'title', 'items']) || !id(p.invoice_id)) return null;
      const out: any = { invoice_id: p.invoice_id };
      if ('name' in p) { if (!text(p.name, 200)) return null; out.name = p.name; }
      if ('title' in p) { if (!text(p.title, 200)) return null; out.title = p.title; }
      if ('dueDate' in p) { if (!date(p.dueDate)) return null; out.dueDate = p.dueDate; }
      if ('items' in p) { const list = items(p.items); if (!list) return null; out.items = list; }
      return Object.keys(out).length > 1 ? { operation, params: out } : null;
    }
    case 'invoices.send': {
      if (!onlyKeys(p, ['invoice_id', 'action']) || !id(p.invoice_id)) return null;
      const action = p.action ?? 'email';
      if (!(SEND_ACTIONS as readonly unknown[]).includes(action)) return null;
      return { operation, params: { invoice_id: p.invoice_id, action: action as typeof SEND_ACTIONS[number] } };
    }
    case 'invoices.record_payment': {
      if (!onlyKeys(p, ['invoice_id', 'mode', 'amount', 'notes']) || !id(p.invoice_id)) return null;
      if (!(PAYMENT_MODES as readonly unknown[]).includes(p.mode)) return null;
      const out: any = { invoice_id: p.invoice_id, mode: p.mode };
      if ('amount' in p) { if (!money(p.amount)) return null; out.amount = p.amount; }
      if ('notes' in p) { if (!text(p.notes, 500)) return null; out.notes = p.notes; }
      return { operation, params: out };
    }
    default:
      return null;
  }
}

/** Verified facts used in summaries and request bodies. */
export interface InvoiceFacts {
  invoice?: Record<string, any>;
  contact?: { id: string; name: string; email?: string; phone?: string };
  ghlUserId?: string | null;
  business?: Record<string, unknown>;
}

/** Map HighLevel invoice settings or a location record to invoice businessDetails. Null if no name. */
export function toBusinessDetails(src: unknown): Record<string, unknown> | null {
  if (!isObj(src)) return null;
  const s: any = isObj((src as any).businessDetails) ? (src as any).businessDetails : isObj((src as any).location) ? (src as any).location : src;
  const name = typeof s.name === 'string' && s.name.trim() ? s.name.trim() : null;
  if (!name) return null;
  const out: Record<string, unknown> = { name };
  const str = (v: unknown) => typeof v === 'string' && v.trim() ? v.trim() : undefined;
  const phone = str(s.phoneNo) ?? str(s.phone); if (phone) out.phoneNo = phone;
  const email = str(s.email); if (email) out.email = email;
  const logo = str(s.logoUrl); if (logo) out.logoUrl = logo;
  const web = str(s.website); if (web) out.website = web;
  if (isObj(s.address)) out.address = s.address;
  else {
    const a: Record<string, string> = {};
    for (const [k, v] of [['addressLine1', s.address], ['city', s.city], ['state', s.state], ['postalCode', s.postalCode], ['countryCode', s.country]] as const) { const t = str(v); if (t) a[k] = t; }
    if (Object.keys(a).length) out.address = a;
  }
  return out;
}

const fmt = (amount: unknown, currency: unknown) =>
  typeof amount === 'number' ? `${amount.toFixed(2)} ${typeof currency === 'string' ? currency : ''}`.trim() : 'an unknown amount';

export function describeWrite(cmd: Command, f: InvoiceFacts): string {
  const p = cmd.params as any;
  const inv = f.invoice;
  const label = inv ? `invoice ${inv.invoiceNumber || inv.name || p.invoice_id} for ${inv.contactDetails?.name || 'the customer'} (${fmt(inv.total, inv.currency)})` : `invoice ${p.invoice_id}`;
  switch (cmd.operation) {
    case 'invoices.create': return `Create a draft invoice "${p.name}" for ${f.contact?.name || p.contact_id}: ${p.items.length} item(s), total ${fmt(itemsTotal(p.items), p.currency)}, issued ${p.issueDate}${p.dueDate ? `, due ${p.dueDate}` : ''}. Nothing is sent to the customer yet.`;
    case 'invoices.update': return `Update ${label}: ${Object.keys(p).filter((k) => k !== 'invoice_id').map((k) => k === 'items' ? `items → new total ${fmt(itemsTotal(p.items), inv?.currency)}` : `${k} → ${p[k]}`).join(', ')}.`;
    case 'invoices.send': return `SEND ${label} to the customer by ${p.action.replace(/_/g, ' ')}. The customer will receive it and can pay it.`;
    case 'invoices.void': return `VOID ${label}. The customer will no longer be able to pay it.`;
    case 'invoices.record_payment': return `RECORD a ${p.mode.replace('_', ' ')} payment of ${p.amount !== undefined ? fmt(p.amount, inv?.currency) : `the full amount due (${fmt(inv?.amountDue ?? inv?.total, inv?.currency)})`} on ${label}${p.notes ? ` — note: "${p.notes}"` : ''}.`;
    case 'invoices.delete': return `PERMANENTLY DELETE ${label}. This cannot be undone.`;
    default: return `Read ${cmd.operation}.`;
  }
}

const alt = (loc: string) => `altId=${loc}&altType=location`;
const toGhlItems = (list: Item[], currency: string) => list.map((i) => ({ ...i, currency }));

/** Build the HighLevel request. Location and contact details come from the server. */
export function buildGhlRequest(cmd: Command, loc: string, f: InvoiceFacts): { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string; body?: Record<string, unknown> } | null {
  const p = cmd.params as any;
  switch (cmd.operation) {
    case 'invoices.list': {
      const q = new URLSearchParams({ altId: loc, altType: 'location', limit: String(p.limit), offset: String(p.offset) });
      if (p.status) q.set('status', p.status);
      return { method: 'GET', path: `/invoices/?${q}` };
    }
    case 'invoices.settings': return { method: 'GET', path: `/invoices/settings?${alt(loc)}` };
    case 'invoices.get': return { method: 'GET', path: `/invoices/${p.invoice_id}?${alt(loc)}` };
    case 'invoices.delete': return { method: 'DELETE', path: `/invoices/${p.invoice_id}?${alt(loc)}` };
    case 'invoices.void': return { method: 'POST', path: `/invoices/${p.invoice_id}/void`, body: { altId: loc, altType: 'location' } };
    case 'invoices.create': {
      if (!f.contact || !f.business) return null;
      const c = f.contact;
      return {
        method: 'POST', path: '/invoices/',
        body: {
          altId: loc, altType: 'location', name: p.name, currency: p.currency, issueDate: p.issueDate,
          ...(p.dueDate ? { dueDate: p.dueDate } : {}), ...(p.title ? { title: p.title } : {}),
          contactDetails: { id: c.id, name: c.name, ...(c.email ? { email: c.email } : {}), ...(c.phone ? { phoneNo: c.phone } : {}) },
          businessDetails: f.business,
          items: toGhlItems(p.items, p.currency), liveMode: true,
        },
      };
    }
    case 'invoices.update': {
      const inv = f.invoice;
      if (!inv) return null;
      const { invoice_id, items: newItems, ...changes } = p;
      return {
        method: 'PUT', path: `/invoices/${invoice_id}`,
        body: {
          altId: loc, altType: 'location',
          name: inv.name, currency: inv.currency, issueDate: inv.issueDate, dueDate: inv.dueDate, title: inv.title,
          contactDetails: inv.contactDetails, businessDetails: inv.businessDetails, discount: inv.discount, termsNotes: inv.termsNotes,
          items: newItems ? toGhlItems(newItems, inv.currency) : inv.items,
          ...changes,
        },
      };
    }
    case 'invoices.send':
      if (!f.ghlUserId) return null;
      return { method: 'POST', path: `/invoices/${p.invoice_id}/send`, body: { altId: loc, altType: 'location', userId: f.ghlUserId, action: p.action, liveMode: true } };
    case 'invoices.record_payment':
      return { method: 'POST', path: `/invoices/${p.invoice_id}/record-payment`, body: { altId: loc, altType: 'location', mode: p.mode, ...(p.amount !== undefined ? { amount: p.amount } : {}), ...(p.notes ? { notes: p.notes } : {}) } };
  }
}

export function projectInvoice(o: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of INVOICE_FIELDS) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = o[k];
  if (Array.isArray(out.items)) out.items = (out.items as any[]).slice(0, MAX_ITEMS).map((i) => ({ name: i?.name, amount: i?.amount, qty: i?.qty, description: i?.description }));
  if (isObj(out.contactDetails)) { const c: any = out.contactDetails; out.contactDetails = { id: c.id, name: c.name, email: c.email, phoneNo: c.phoneNo }; }
  return out;
}

/** Unwrap a single invoice object from a HighLevel response. */
export function unwrapInvoice(body: any): Record<string, any> | null {
  if (!isObj(body)) return null;
  if (isObj(body.invoice)) return body.invoice as Record<string, any>;
  return typeof body._id === 'string' ? body : null;
}
