# Fix the two test snags (calendars + invoices)

## What the logs show

1. **Calendar test (14:50 UTC)** — The AI asked for "list calendars" and added an extra option (`include: "all"`). Our calendar service only accepts an empty request for that action, so it refused with "The CRM request was not valid." HighLevel was never contacted.
2. **Invoice test (14:49 UTC)** — The draft invoice request reached HighLevel, which rejected it: "businessDetails should not be empty". HighLevel requires your business name/details on every invoice, and we weren't sending them.

Everything else (sign-in, identity note, routing in CMS v2) worked correctly in both runs.

## Fixes

**Calendars**
- "List calendars" will ignore harmless extra options instead of failing (it takes no options anyway).
- When any calendar/invoice request is refused, the error will name the field that was wrong, so the AI can correct itself and retry instead of giving up.
- Tighten the Calendars tool description in CMS v2 so the AI sends the right shape.

**Invoices**
- Before creating a draft, the service will look up your business details for the connected location from HighLevel (business name, address, phone, email, logo) and attach them automatically. The AI never supplies these.
- If HighLevel won't share business details, the invoice is not created and the AI says plainly that the business profile in HighLevel needs filling in.

## After the fix
- Re-run the same two tests in the preview: "list my calendars" and "create a $1 draft invoice for Joshua".
- Once both pass, I'll ask again before unplugging the old Contacts/Conversations/Calendar/Invoice tools from the chat workflow.

## Technical details
- `_shared/ghl-calendars-core.ts`: `calendars.list` accepts and drops unknown keys; validators return a reason string surfaced as `error.field` in the schema-1.0 envelope (same change applied in invoices core).
- `_shared/ghl-invoices-core.ts`: `invoices.create` prepare step fetches `GET /locations/{locationId}` (server-set location) and maps `name, address, phone, email, logoUrl, website` into `businessDetails`; prepare fails closed with `BUSINESS_DETAILS_MISSING` if name is absent. Deno tests added for both rules.
- Risk: the location lookup may need the `locations.readonly` scope on the draft app. If it is missing, fallback is `GET /invoices/settings` business info; if that is also empty, we'll ask you to add the scope in the draft app.
- Redeploy `ghl-calendars` and `ghl-invoices` only; update the Calendars tool description in CMS v2 and publish.
