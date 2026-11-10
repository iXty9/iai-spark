// Invoices tool for n8n (CMS v2). Invoices and contacts are verified against
// the user's own sub-account; contact details on new invoices come from the
// verified contact record, never from the AI.
import { serveTool, upstreamFailure, type Outcome } from '../_shared/ghl-tool-runtime.ts';
import {
  buildGhlRequest, describeWrite, isHighRisk, isWrite, parseRequest, projectInvoice, toBusinessDetails, unwrapInvoice,
  type Command, type InvoiceFacts,
} from '../_shared/ghl-invoices-core.ts';

const V = '2021-07-28';
type Fail = Extract<Outcome, { ok: false }>;

serveTool<Command, InvoiceFacts>({
  name: 'ghl-invoices',
  parse: parseRequest,
  isWrite,
  isHighRisk,
  async prepare(ctx, cmd) {
    const p = cmd.params as any;
    const facts: InvoiceFacts = { ghlUserId: ctx.installation.ghl_user_id };
    if (p.invoice_id) {
      const r = await ctx.ghl(V, 'GET', `/invoices/${p.invoice_id}?altId=${ctx.loc}&altType=location`);
      if (r.status < 200 || r.status >= 300) return upstreamFailure(r.status);
      const inv = unwrapInvoice(r.json);
      if (!inv || inv._id !== p.invoice_id) return { ok: false, code: 'INVALID_RESPONSE', status: r.status };
      if (inv.altId !== ctx.loc) return { ok: false, code: 'TENANT_MISMATCH', status: r.status };
      if (cmd.operation === 'invoices.update' && inv.status !== 'draft') return { ok: false, code: 'UPSTREAM_REQUEST_REJECTED', status: null, data: { reason: 'Only draft invoices can be edited.' } };
      facts.invoice = inv;
    }
    if (p.contact_id) {
      const r = await ctx.ghl(V, 'GET', `/contacts/${p.contact_id}`);
      if (r.status < 200 || r.status >= 300) return upstreamFailure(r.status);
      const c = r.json?.contact;
      if (!c || c.id !== p.contact_id) return { ok: false, code: 'INVALID_RESPONSE', status: r.status };
      if (c.locationId !== ctx.loc) return { ok: false, code: 'TENANT_MISMATCH', status: r.status };
      const name = String(c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || c.id);
      facts.contact = { id: c.id, name, email: c.email || undefined, phone: c.phone || undefined };
    }
    if (cmd.operation === 'invoices.create') {
      // Business details come from HighLevel, never from the AI.
      const s = await ctx.ghl(V, 'GET', `/invoices/settings?altId=${ctx.loc}&altType=location`);
      let biz = s.status >= 200 && s.status < 300 ? toBusinessDetails(s.json) : null;
      if (!biz) {
        const l = await ctx.ghl(V, 'GET', `/locations/${ctx.loc}`);
        if (l.status >= 200 && l.status < 300) {
          const lid = l.json?.location?.id;
          if (lid && lid !== ctx.loc) return { ok: false, code: 'TENANT_MISMATCH', status: l.status };
          biz = toBusinessDetails(l.json);
        }
      }
      if (!biz) return { ok: false, code: 'UPSTREAM_REQUEST_REJECTED', status: null, data: { reason: 'HighLevel has no business name for this sub-account. Fill in Settings > Business Profile in HighLevel, then try again.' } };
      facts.business = biz;
    }
    if (cmd.operation === 'invoices.send' && !facts.ghlUserId) return { ok: false, code: 'MISSING_HIGHLEVEL_USER' } as Fail;
    return { ok: true, prep: facts };
  },
  describe: describeWrite,
  async run(ctx, cmd, facts) {
    const g = buildGhlRequest(cmd, ctx.loc, facts);
    if (!g) return { ok: false, code: 'INVALID_REQUEST' };
    const r = await ctx.ghl(V, g.method, g.path, g.body);
    if (r.status < 200 || r.status >= 300) return upstreamFailure(r.status);
    const b = r.json;
    const p = cmd.params as any;
    switch (cmd.operation) {
      case 'invoices.list': {
        const list = b?.invoices;
        if (!Array.isArray(list)) return { ok: false, code: 'INVALID_RESPONSE', status: r.status };
        if (list.some((i: any) => i?.altId !== ctx.loc)) return { ok: false, code: 'TENANT_MISMATCH', status: r.status };
        return { ok: true, data: { invoices: list.slice(0, p.limit).map(projectInvoice), total: Number.isInteger(b.total) ? b.total : null } };
      }
      case 'invoices.settings':
        return { ok: true, data: { settings: b && typeof b === 'object' ? { currency: b.currency, termsNotes: b.termsNotes, title: b.title, businessName: b.businessDetails?.name } : null } };
      case 'invoices.get':
        return { ok: true, data: { invoice: projectInvoice(facts.invoice!) } };
      case 'invoices.create':
      case 'invoices.update':
      case 'invoices.void':
      case 'invoices.record_payment': {
        const inv = unwrapInvoice(b);
        if (inv && inv.altId !== undefined && inv.altId !== ctx.loc) return { ok: false, code: 'TENANT_MISMATCH', status: r.status };
        return { ok: true, data: inv ? { invoice: projectInvoice(inv) } : { invoice_id: p.invoice_id ?? null, done: true } };
      }
      case 'invoices.send':
        return { ok: true, data: { sent: true, invoice_id: p.invoice_id, action: p.action } };
      case 'invoices.delete':
        return { ok: true, data: { deleted: true, invoice_id: p.invoice_id } };
    }
  },
});
