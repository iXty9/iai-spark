import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import * as cal from './ghl-calendars-core.ts';
import * as inv from './ghl-invoices-core.ts';

const LOC = 'YZQCL96jxM5knY233VD4';

Deno.test('calendars: caller cannot pass locationId; server sets it', () => {
  const l = cal.parseCommand('calendars.list', { locationId: 'OTHER', include: 'all' })!;
  assertEquals(l.params, {});
  assertEquals(cal.buildGhlRequest(l, LOC).path, `/calendars/?locationId=${LOC}`);
  const c = cal.parseCommand('calendars.appointments.create', { calendar_id: 'k1', contact_id: 'c1', startTime: '2026-11-12T15:00:00-06:00' })!;
  assertEquals(cal.buildGhlRequest(c, LOC).body?.locationId, LOC);
});

Deno.test('calendars: times must include a timezone and end after start', () => {
  assertEquals(cal.parseCommand('calendars.appointments.create', { calendar_id: 'k1', contact_id: 'c1', startTime: '2026-11-12T15:00:00' }), null);
  assertEquals(cal.parseCommand('calendars.block_slots.create', { calendar_id: 'k1', startTime: '2026-11-12T15:00:00Z', endTime: '2026-11-12T14:00:00Z' }), null);
});

Deno.test('calendars: date ranges are limited to 31 days', () => {
  assertEquals(cal.parseCommand('calendars.events.list', { calendar_id: 'k1', start: '2026-11-01T00:00:00Z', end: '2026-12-15T00:00:00Z' }), null);
  assert(cal.parseCommand('calendars.events.list', { calendar_id: 'k1', start: '2026-11-01T00:00:00Z', end: '2026-11-30T00:00:00Z' }));
});

Deno.test('calendars: deletes and calendar creation are high risk writes', () => {
  for (const op of ['calendars.events.delete', 'calendars.delete', 'calendars.create']) { assert(cal.isWrite(op)); assert(cal.isHighRisk(op)); }
  assertEquals(cal.isWrite('calendars.free_slots'), false);
});

Deno.test('calendars: ids cannot change the path', () => {
  assertEquals(cal.parseCommand('calendars.events.delete', { event_id: '../x' }), null);
});

Deno.test('invoices: altId comes from the server, not the caller', () => {
  assertEquals(inv.parseCommand('invoices.list', { altId: 'OTHER' }), null);
  const c = inv.parseCommand('invoices.list', {})!;
  assert(inv.buildGhlRequest(c, LOC, {})!.path.includes(`altId=${LOC}`));
});

Deno.test('invoices: amounts must be positive with at most 2 decimals; max 50 items', () => {
  const base = { contact_id: 'c1', name: 'Svc', currency: 'USD', issueDate: '2026-11-10' };
  assertEquals(inv.parseCommand('invoices.create', { ...base, items: [{ name: 'a', amount: -5, qty: 1 }] }), null);
  assertEquals(inv.parseCommand('invoices.create', { ...base, items: [{ name: 'a', amount: 1.005, qty: 1 }] }), null);
  assertEquals(inv.parseCommand('invoices.create', { ...base, items: Array(51).fill({ name: 'a', amount: 1, qty: 1 }) }), null);
  assert(inv.parseCommand('invoices.create', { ...base, items: [{ name: 'a', amount: 125, qty: 2 }] }));
});

Deno.test('invoices: contact details on a new invoice come from the verified contact', () => {
  const c = inv.parseCommand('invoices.create', { contact_id: 'c1', name: 'Svc', currency: 'USD', issueDate: '2026-11-10', items: [{ name: 'a', amount: 125, qty: 2 }] })!;
  assertEquals(inv.buildGhlRequest(c, LOC, {}), null);
  const contact = { id: 'c1', name: 'Joshua', email: 'j@example.com' };
  assertEquals(inv.buildGhlRequest(c, LOC, { contact }), null); // no business details -> not sent
  const req = inv.buildGhlRequest(c, LOC, { contact, business: { name: 'IXTY9 LLC' } })!;
  assertEquals((req.body as any).businessDetails, { name: 'IXTY9 LLC' });
  assertEquals((req.body as any).contactDetails, { id: 'c1', name: 'Joshua', email: 'j@example.com' });
  assert(inv.describeWrite(c, { contact: { id: 'c1', name: 'Joshua' } }).includes('250.00 USD'));
});

Deno.test('invoices: send needs a HighLevel user and is high risk', () => {
  const c = inv.parseCommand('invoices.send', { invoice_id: 'i1' })!;
  assertEquals(inv.buildGhlRequest(c, LOC, { ghlUserId: null }), null);
  assert(inv.isHighRisk('invoices.send') && inv.isHighRisk('invoices.void') && inv.isHighRisk('invoices.record_payment') && inv.isHighRisk('invoices.delete'));
  assertEquals(inv.isHighRisk('invoices.create'), false);
});

Deno.test('invoices: payment mode must be one HighLevel accepts', () => {
  assertEquals(inv.parseCommand('invoices.record_payment', { invoice_id: 'i1', mode: 'crypto' }), null);
  assert(inv.parseCommand('invoices.record_payment', { invoice_id: 'i1', mode: 'cash', amount: 50 }));
});

Deno.test('invoices: business details are read from HighLevel settings or location', () => {
  assertEquals(inv.toBusinessDetails({ businessDetails: { name: ' IXTY9 LLC ', phoneNo: '+1555' } }), { name: 'IXTY9 LLC', phoneNo: '+1555' });
  assertEquals(inv.toBusinessDetails({ location: { name: 'Shop', email: 'a@b.co', city: 'Austin' } }), { name: 'Shop', email: 'a@b.co', address: { city: 'Austin' } });
  assertEquals(inv.toBusinessDetails({ businessDetails: { name: '' } }), null);
});

Deno.test('invoices: settings ignores stray options and uses the server location', () => {
  const c = inv.parseCommand('invoices.settings', { altId: 'OTHER' })!;
  assertEquals(c.params, {});
  assertEquals(inv.buildGhlRequest(c, LOC, {})!.path, `/invoices/settings?altId=${LOC}&altType=location`);
});
