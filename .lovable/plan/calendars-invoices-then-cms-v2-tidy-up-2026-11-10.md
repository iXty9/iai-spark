# Calendars, invoices, then CMS v2 tidy-up

Each slice uses the same recipe as contacts and conversations: its own service, rule tests, routing in CMS v2, a new tool in your chat workflow, publishing both workflows, then one live check by you.

## Slice C: Calendars (new "CMS v2 Calendars" tool)
- **Reads:** list calendars, open one, free slots, calendar events, blocked slots, and open an appointment.
- **Writes (confirm first):** create and update appointments, and create and update blocked times.
- **High risk:** delete an event or appointment, and create or delete a calendar.
- **Safety:** every calendar and appointment is checked against your own sub-account before any change. Appointments must be for a contact in your sub-account. Times must include a timezone. The summary shows the contact, calendar, start and end in plain words.

## Slice E: Invoices (new "CMS v2 Invoices" tool)
- **Reads:** list invoices, open one, and invoice settings.
- **Writes (confirm first):** create and update a draft invoice.
- **High risk:** send an invoice to the customer, void it, record a payment, and delete it.
- **Safety:** the invoice and contact are checked against your own sub-account first. The summary shows the customer, the total, the currency, and what will happen ("will email Joshua an invoice for $250.00").
- Amounts are limited to positive numbers with a cap on line-item count. Payments use only the methods HighLevel allows.

## Tidy CMS v2
- Group the canvas into sections: Input & checks, Service call, Results, Self-tests.
- Remove the 2 extra manual test starters and the old "Pilot search input" smoke test, keeping one combined self-test run.
- Rename nodes so they don't say "contacts" when they handle every area.
- Rewrite the self-test node to cover every operation's routing and rejection of unknown operations.

## After this
- In your chat workflow, the old Contacts, Conversations, Calendar and Invoice sub-agents can be unplugged once you're happy. I'll ask before removing them.
- Then publish the app to ixty.ai, move incoming HighLevel alerts off the old workflow, and retire the old proxy.

## Technical notes
- New functions: `ghl-calendars` and `ghl-invoices`, with `_shared/ghl-calendars-core.ts` and `_shared/ghl-invoices-core.ts` plus Deno tests, `verify_jwt = false` in config, and in-function actor verification.
- Both reuse `_shared/ghl-write-gate.ts`, the token manager, and an ownership pre-check (fetch the target, compare its locationId).
- HighLevel API versions are 2021-04-15 for calendars and 2021-07-28 for invoices. Invoice calls also pass `altId` set to the location and `altType=location`, both set by the server.
- I'll confirm the exact HighLevel endpoint and field shapes from their docs before coding. Anything unclear will fail closed rather than guess.
