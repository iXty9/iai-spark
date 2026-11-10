// Pure rules for the calendars tool (typed schema_version 1.0). No I/O.
export const READ_OPERATIONS = ['calendars.list', 'calendars.get', 'calendars.free_slots', 'calendars.events.list', 'calendars.blocked_slots.list', 'calendars.appointments.get'] as const;
export const WRITE_OPERATIONS = [
  'calendars.appointments.create', 'calendars.appointments.update',
  'calendars.block_slots.create', 'calendars.block_slots.update',
  'calendars.events.delete', 'calendars.create', 'calendars.delete',
] as const;
export const HIGH_RISK_OPERATIONS: readonly string[] = ['calendars.events.delete', 'calendars.create', 'calendars.delete'];
export const APPOINTMENT_STATUSES = ['new', 'confirmed', 'cancelled', 'showed', 'noshow'] as const;
export const CALENDAR_TYPES = ['personal', 'round_robin', 'collective', 'class_booking', 'service_booking', 'event'] as const;

export type Operation = typeof READ_OPERATIONS[number] | typeof WRITE_OPERATIONS[number];
type Status = typeof APPOINTMENT_STATUSES[number];

type Range = { start: string; end: string };
export type Command =
  | { operation: 'calendars.list'; params: Record<string, never> }
  | { operation: 'calendars.get' | 'calendars.delete'; params: { calendar_id: string } }
  | { operation: 'calendars.free_slots'; params: { calendar_id: string; timezone?: string } & Range }
  | { operation: 'calendars.events.list' | 'calendars.blocked_slots.list'; params: { calendar_id: string } & Range }
  | { operation: 'calendars.appointments.get' | 'calendars.events.delete'; params: { event_id: string } }
  | { operation: 'calendars.appointments.create'; params: { calendar_id: string; contact_id: string; startTime: string; endTime?: string; title?: string; appointmentStatus?: Status } }
  | { operation: 'calendars.appointments.update'; params: { event_id: string; startTime?: string; endTime?: string; title?: string; appointmentStatus?: Status } }
  | { operation: 'calendars.block_slots.create'; params: { calendar_id: string; startTime: string; endTime: string; title?: string } }
  | { operation: 'calendars.block_slots.update'; params: { event_id: string; startTime?: string; endTime?: string; title?: string } }
  | { operation: 'calendars.create'; params: { name: string; description?: string; calendarType?: typeof CALENDAR_TYPES[number] } };

const ID_RE = /^[A-Za-z0-9]{1,128}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_TZ_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const TZ_RE = /^[A-Za-z]+(?:[/_+-][A-Za-z0-9]+){0,3}$/;
const CONTROL_RE = /[\x00-\x1f\x7f]/;
const MAX_RANGE_MS = 31 * 24 * 3600 * 1000;

export const CALENDAR_FIELDS = ['id', 'name', 'description', 'calendarType', 'isActive', 'locationId', 'slotDuration', 'slotDurationUnit'];
export const EVENT_FIELDS = ['id', 'calendarId', 'contactId', 'locationId', 'title', 'startTime', 'endTime', 'appointmentStatus', 'assignedUserId'];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const onlyKeys = (o: Record<string, unknown>, k: string[]) => Object.keys(o).every((x) => k.includes(x));
const id = (v: unknown): v is string => typeof v === 'string' && ID_RE.test(v);
const iso = (v: unknown): v is string => typeof v === 'string' && ISO_TZ_RE.test(v) && !Number.isNaN(Date.parse(v));
const text = (v: unknown, max: number): v is string => typeof v === 'string' && !!v.trim() && v.length <= max && !CONTROL_RE.test(v);

export const isWrite = (op: string) => (WRITE_OPERATIONS as readonly string[]).includes(op);
export const isHighRisk = (op: string) => HIGH_RISK_OPERATIONS.includes(op);

function range(p: Record<string, unknown>): Range | null {
  if (!iso(p.start) || !iso(p.end)) return null;
  const d = Date.parse(p.end) - Date.parse(p.start);
  return d > 0 && d <= MAX_RANGE_MS ? { start: p.start, end: p.end } : null;
}
function times(p: Record<string, unknown>, needStart: boolean, needEnd: boolean): { startTime?: string; endTime?: string } | null {
  const out: { startTime?: string; endTime?: string } = {};
  if ('startTime' in p) { if (!iso(p.startTime)) return null; out.startTime = p.startTime; } else if (needStart) return null;
  if ('endTime' in p) { if (!iso(p.endTime)) return null; out.endTime = p.endTime; } else if (needEnd) return null;
  if (out.startTime && out.endTime && Date.parse(out.endTime) <= Date.parse(out.startTime)) return null;
  return out;
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
    case 'calendars.list':
      return Object.keys(p).length === 0 ? { operation, params: {} } : null;
    case 'calendars.get':
    case 'calendars.delete':
      return onlyKeys(p, ['calendar_id']) && id(p.calendar_id) ? { operation, params: { calendar_id: p.calendar_id } } : null;
    case 'calendars.free_slots': {
      if (!onlyKeys(p, ['calendar_id', 'start', 'end', 'timezone']) || !id(p.calendar_id)) return null;
      const r = range(p);
      if (!r) return null;
      if ('timezone' in p && (typeof p.timezone !== 'string' || !TZ_RE.test(p.timezone))) return null;
      return { operation, params: { calendar_id: p.calendar_id, ...r, ...('timezone' in p ? { timezone: p.timezone as string } : {}) } };
    }
    case 'calendars.events.list':
    case 'calendars.blocked_slots.list': {
      if (!onlyKeys(p, ['calendar_id', 'start', 'end']) || !id(p.calendar_id)) return null;
      const r = range(p);
      return r ? { operation, params: { calendar_id: p.calendar_id, ...r } } : null;
    }
    case 'calendars.appointments.get':
    case 'calendars.events.delete':
      return onlyKeys(p, ['event_id']) && id(p.event_id) ? { operation, params: { event_id: p.event_id } } : null;
    case 'calendars.appointments.create': {
      if (!onlyKeys(p, ['calendar_id', 'contact_id', 'startTime', 'endTime', 'title', 'appointmentStatus']) || !id(p.calendar_id) || !id(p.contact_id)) return null;
      const t = times(p, true, false);
      if (!t) return null;
      const out: any = { calendar_id: p.calendar_id, contact_id: p.contact_id, ...t };
      if ('title' in p) { if (!text(p.title, 200)) return null; out.title = p.title; }
      if ('appointmentStatus' in p) { if (!(APPOINTMENT_STATUSES as readonly unknown[]).includes(p.appointmentStatus)) return null; out.appointmentStatus = p.appointmentStatus; }
      return { operation, params: out };
    }
    case 'calendars.appointments.update': {
      if (!onlyKeys(p, ['event_id', 'startTime', 'endTime', 'title', 'appointmentStatus']) || !id(p.event_id)) return null;
      const t = times(p, false, false);
      if (!t) return null;
      const out: any = { event_id: p.event_id, ...t };
      if ('title' in p) { if (!text(p.title, 200)) return null; out.title = p.title; }
      if ('appointmentStatus' in p) { if (!(APPOINTMENT_STATUSES as readonly unknown[]).includes(p.appointmentStatus)) return null; out.appointmentStatus = p.appointmentStatus; }
      return Object.keys(out).length > 1 ? { operation, params: out } : null;
    }
    case 'calendars.block_slots.create': {
      if (!onlyKeys(p, ['calendar_id', 'startTime', 'endTime', 'title']) || !id(p.calendar_id)) return null;
      const t = times(p, true, true);
      if (!t) return null;
      const out: any = { calendar_id: p.calendar_id, ...t };
      if ('title' in p) { if (!text(p.title, 200)) return null; out.title = p.title; }
      return { operation, params: out };
    }
    case 'calendars.block_slots.update': {
      if (!onlyKeys(p, ['event_id', 'startTime', 'endTime', 'title']) || !id(p.event_id)) return null;
      const t = times(p, false, false);
      if (!t) return null;
      const out: any = { event_id: p.event_id, ...t };
      if ('title' in p) { if (!text(p.title, 200)) return null; out.title = p.title; }
      return Object.keys(out).length > 1 ? { operation, params: out } : null;
    }
    case 'calendars.create': {
      if (!onlyKeys(p, ['name', 'description', 'calendarType']) || !text(p.name, 100)) return null;
      const out: any = { name: p.name };
      if ('description' in p) { if (!text(p.description, 1000)) return null; out.description = p.description; }
      if ('calendarType' in p) { if (!(CALENDAR_TYPES as readonly unknown[]).includes(p.calendarType)) return null; out.calendarType = p.calendarType; }
      return { operation, params: out };
    }
    default:
      return null;
  }
}

/** Build the HighLevel request. locationId always comes from the server. */
export function buildGhlRequest(cmd: Command, loc: string): { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string; body?: Record<string, unknown> } {
  const p = cmd.params as any;
  const ms = (s: string) => String(Date.parse(s));
  switch (cmd.operation) {
    case 'calendars.list': return { method: 'GET', path: `/calendars/?locationId=${loc}` };
    case 'calendars.get': return { method: 'GET', path: `/calendars/${p.calendar_id}` };
    case 'calendars.delete': return { method: 'DELETE', path: `/calendars/${p.calendar_id}` };
    case 'calendars.free_slots': {
      const q = new URLSearchParams({ startDate: ms(p.start), endDate: ms(p.end) });
      if (p.timezone) q.set('timezone', p.timezone);
      return { method: 'GET', path: `/calendars/${p.calendar_id}/free-slots?${q}` };
    }
    case 'calendars.events.list':
    case 'calendars.blocked_slots.list': {
      const q = new URLSearchParams({ locationId: loc, calendarId: p.calendar_id, startTime: ms(p.start), endTime: ms(p.end) });
      return { method: 'GET', path: `/calendars/${cmd.operation === 'calendars.events.list' ? 'events' : 'blocked-slots'}?${q}` };
    }
    case 'calendars.appointments.get': return { method: 'GET', path: `/calendars/events/appointments/${p.event_id}` };
    case 'calendars.events.delete': return { method: 'DELETE', path: `/calendars/events/${p.event_id}`, body: {} };
    case 'calendars.appointments.create': {
      const { calendar_id, contact_id, ...rest } = p;
      return { method: 'POST', path: '/calendars/events/appointments', body: { locationId: loc, calendarId: calendar_id, contactId: contact_id, ...rest } };
    }
    case 'calendars.appointments.update': {
      const { event_id, ...rest } = p;
      return { method: 'PUT', path: `/calendars/events/appointments/${event_id}`, body: rest };
    }
    case 'calendars.block_slots.create': {
      const { calendar_id, ...rest } = p;
      return { method: 'POST', path: '/calendars/events/block-slots', body: { locationId: loc, calendarId: calendar_id, ...rest } };
    }
    case 'calendars.block_slots.update': {
      const { event_id, ...rest } = p;
      return { method: 'PUT', path: `/calendars/events/block-slots/${event_id}`, body: { locationId: loc, ...rest } };
    }
    case 'calendars.create': return { method: 'POST', path: '/calendars/', body: { locationId: loc, ...p } };
  }
}

export function describeWrite(cmd: Command, names: { calendar?: string; contact?: string; event?: string }): string {
  const p = cmd.params as any;
  const when = (s?: string, e?: string) => [s && `from ${s}`, e && `to ${e}`].filter(Boolean).join(' ');
  switch (cmd.operation) {
    case 'calendars.appointments.create': return `Book an appointment${p.title ? ` "${p.title}"` : ''} for ${names.contact || p.contact_id} on calendar ${names.calendar || p.calendar_id} ${when(p.startTime, p.endTime)}.`;
    case 'calendars.appointments.update': return `Change appointment ${names.event || p.event_id}: ${Object.entries(p).filter(([k]) => k !== 'event_id').map(([k, v]) => `${k} → ${v}`).join(', ')}.`;
    case 'calendars.block_slots.create': return `Block time on calendar ${names.calendar || p.calendar_id} ${when(p.startTime, p.endTime)}${p.title ? ` ("${p.title}")` : ''}.`;
    case 'calendars.block_slots.update': return `Change blocked time ${names.event || p.event_id}: ${Object.entries(p).filter(([k]) => k !== 'event_id').map(([k, v]) => `${k} → ${v}`).join(', ')}.`;
    case 'calendars.events.delete': return `PERMANENTLY DELETE calendar event ${names.event || p.event_id}.`;
    case 'calendars.create': return `Create a new calendar "${p.name}"${p.calendarType ? ` (${p.calendarType})` : ''}.`;
    case 'calendars.delete': return `PERMANENTLY DELETE calendar ${names.calendar || p.calendar_id} and all its settings. This cannot be undone.`;
    default: return `Read ${cmd.operation}.`;
  }
}

export function project(o: Record<string, unknown>, fields: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of fields) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = o[k];
  return out;
}

/** HighLevel wraps single events inconsistently; find the event object. */
export function unwrapEvent(body: any): Record<string, unknown> | null {
  if (!isObj(body)) return null;
  for (const k of ['appointment', 'event']) if (isObj(body[k])) return body[k] as Record<string, unknown>;
  return typeof body.id === 'string' ? body : null;
}
