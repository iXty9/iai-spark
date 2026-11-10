# Fix "list my calendars"

## What happened
The invoice test worked. The calendar request never reached our calendar service this time. The chat assistant sent "list calendars" correctly (with no extra options), but the **CMS v2 Calendars** tool in your chat workflow refused it. That tool's settings don't allow an empty set of options, and "list calendars" doesn't take any. The assistant then sent a bug report email to wave@ixty9.com and gave up.

The same problem would hit "show invoice settings", which also takes no options.

## Fix
1. In your chat workflow (🧠 Ixty AI: iai-spark jleemc44), change how all four CMS v2 tools (Contacts, Conversations, Calendars, Invoices) pass their options, so an empty set is allowed. The assistant will send the options as text, and CMS v2 will read that text back.
2. In the CMS v2 workflow, update the "Validate & route request" step so it reads the options whether they arrive as text or already unpacked. Blank text means "no options". Anything unreadable is still refused.
3. Make "show invoice settings" ignore stray options, the same way "list calendars" now does.
4. Add a CMS v2 self-check for an empty "list calendars" request, then publish both workflows.

## After the fix
Ask "list my calendars" again in the preview. If it works, I'll ask before unplugging the old CRM tools from your chat workflow.

## Technical details
- In `vy6OYZc01sRHRpPP`, the four `toolWorkflow` nodes use `$fromAI('params', …, 'json')`. n8n rejects `{}` ("Value must be a non-empty object or a non-empty array"). Switch to type `'string'` with the description "JSON object as text, use {} when none".
- In CMS v2 (`WJwAJ0X5Qy64MJ1q`), the validator does: if params is a string → trim; empty → `{}`; otherwise `JSON.parse`, which must give a plain object or the request returns INVALID_REQUEST. The server-side checks in ghl-* stay as they are.
- `_shared/ghl-invoices-core.ts`: `invoices.settings` drops unknown keys. Add a Deno test, then redeploy `ghl-invoices`.
