// Calendars tool for n8n (CMS v2). Every calendar, event and contact is checked
// against the user's own sub-account before anything changes.
import { serveTool, upstreamFailure, type Outcome, type ToolContext } from '../_shared/ghl-tool-runtime.ts';
import {
  buildGhlRequest, CALENDAR_FIELDS, describeWrite, EVENT_FIELDS, isHighRisk, isWrite, parseRequest, project, unwrapEvent,
  type Command,
} from '../_shared/ghl-calendars-core.ts';

const V = '2021-04-15';
type Prep = { calendar?: string; contact?: string; event?: string };
type Fail = Extract<Outcome, { ok: false }>;

async function ownCalendar(ctx: ToolContext, calendarId: string): Promise<{ name: string } | Fail> {
  const r = await ctx.ghl(V, 'GET', `/calendars/${calendarId}`);
  if (r.status < 200 || r.status >= 300) return upstreamFailure(r.status);
  const c = r.json?.calendar;
  if (!c || c.id !== calendarId) return { ok: false, code: 'INVALID_RESPONSE', status: r.status };
  if (c.locationId !== ctx.loc) return { ok: false, code: 'TENANT_MISMATCH', status: r.status };
  return { name: String(c.name || calendarId) };
}

async function ownEvent(ctx: ToolContext, eventId: string): Promise<{ label: string } | Fail> {
  const r = await ctx.ghl(V, 'GET', `/calendars/events/appointments/${eventId}`);
  if (r.status < 200 || r.status >= 300) return upstreamFailure(r.status);
  const e = unwrapEvent(r.json);
  if (!e || e.id !== eventId) return { ok: false, code: 'INVALID_RESPONSE', status: r.status };
  if (e.locationId !== ctx.loc) return { ok: false, code: 'TENANT_MISMATCH', status: r.status };
  return { label: `${e.title || eventId}${e.startTime ? ` (${e.startTime})` : ''}` };
}

async function ownContact(ctx: ToolContext, contactId: string): Promise<{ name: string } | Fail> {
  const r = await ctx.ghl('2021-07-28', 'GET', `/contacts/${contactId}`);
  if (r.status < 200 || r.status >= 300) return upstreamFailure(r.status);
  const c = r.json?.contact;
  if (!c || c.id !== contactId) return { ok: false, code: 'INVALID_RESPONSE', status: r.status };
  if (c.locationId !== ctx.loc) return { ok: false, code: 'TENANT_MISMATCH', status: r.status };
  return { name: String(c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || contactId) };
}

const isFail = (x: unknown): x is Fail => !!x && (x as any).ok === false;

serveTool<Command, Prep>({
  name: 'ghl-calendars',
  parse: parseRequest,
  isWrite,
  isHighRisk,
  async prepare(ctx, cmd) {
    const p = cmd.params as any;
    const prep: Prep = {};
    if (p.calendar_id) {
      const c = await ownCalendar(ctx, p.calendar_id);
      if (isFail(c)) return c;
      prep.calendar = c.name;
    }
    if (p.event_id) {
      const e = await ownEvent(ctx, p.event_id);
      if (isFail(e)) return e;
      prep.event = e.label;
    }
    if (p.contact_id) {
      const c = await ownContact(ctx, p.contact_id);
      if (isFail(c)) return c;
      prep.contact = c.name;
    }
    return { ok: true, prep };
  },
  describe: (cmd, prep) => describeWrite(cmd, prep),
  async run(ctx, cmd) {
    const g = buildGhlRequest(cmd, ctx.loc);
    const r = await ctx.ghl(V, g.method, g.path, g.body);
    if (r.status < 200 || r.status >= 300) return upstreamFailure(r.status);
    const b = r.json;
    if (!b || typeof b !== 'object') return { ok: false, code: 'INVALID_RESPONSE', status: r.status };
    const p = cmd.params as any;
    const events = (list: unknown) => {
      if (!Array.isArray(list)) return null;
      if (list.some((e: any) => !e || typeof e.id !== 'string' || (e.locationId !== undefined && e.locationId !== ctx.loc))) return null;
      return list.slice(0, 200).map((e: any) => project(e, EVENT_FIELDS));
    };
    switch (cmd.operation) {
      case 'calendars.list': {
        const list = b.calendars;
        if (!Array.isArray(list)) return { ok: false, code: 'INVALID_RESPONSE', status: r.status };
        if (list.some((c: any) => c.locationId !== ctx.loc)) return { ok: false, code: 'TENANT_MISMATCH', status: r.status };
        return { ok: true, data: { calendars: list.map((c: any) => project(c, CALENDAR_FIELDS)) } };
      }
      case 'calendars.get':
        return { ok: true, data: { calendar: project(b.calendar, CALENDAR_FIELDS) } };
      case 'calendars.free_slots': {
        const days: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(b)) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Array.isArray((v as any)?.slots)) days[k] = (v as any).slots.filter((s: unknown) => typeof s === 'string').slice(0, 200);
        }
        return { ok: true, data: { calendar_id: p.calendar_id, slots_by_day: days } };
      }
      case 'calendars.events.list':
      case 'calendars.blocked_slots.list': {
        const list = events(b.events);
        if (!list) return { ok: false, code: 'INVALID_RESPONSE', status: r.status };
        return { ok: true, data: { calendar_id: p.calendar_id, events: list } };
      }
      case 'calendars.appointments.get':
      case 'calendars.appointments.create':
      case 'calendars.appointments.update':
      case 'calendars.block_slots.create':
      case 'calendars.block_slots.update': {
        const e = unwrapEvent(b);
        if (!e) return { ok: false, code: 'INVALID_RESPONSE', status: r.status };
        if (e.locationId !== undefined && e.locationId !== ctx.loc) return { ok: false, code: 'TENANT_MISMATCH', status: r.status };
        return { ok: true, data: { event: project(e, EVENT_FIELDS) } };
      }
      case 'calendars.create': {
        const c = b.calendar;
        if (!c || typeof c.id !== 'string') return { ok: false, code: 'INVALID_RESPONSE', status: r.status };
        return { ok: true, data: { calendar: project(c, CALENDAR_FIELDS) } };
      }
      case 'calendars.events.delete':
        return { ok: true, data: { deleted: true, event_id: p.event_id } };
      case 'calendars.delete':
        return { ok: true, data: { deleted: true, calendar_id: p.calendar_id } };
    }
  },
});
