# Contacts search and retrieval in the signed-in app (CMS v2)

## Goal
You search for a contact in normal ixty.ai chat, pick one, and the app shows that same contact's details. CMS v2 runs it, using the Marketplace app's HighLevel connection. Nothing is written to the CRM.

## Recommended path

```text
Browser (signed in)
  -> chat-relay (new backend function: checks your real session, finds your workflow address on the server, signs a 2-minute "actor pass")
  -> CMS v2 webhook (n8n)
  -> two fixed tools: contacts_search, contacts_get (the AI fills in only the search text or contact ID; the pass comes from the request, not the AI)
  -> ghl-contacts (new backend function: checks the pass, re-checks that you own the installation, gets a Location token, calls only the two HighLevel contact read endpoints, cleans up the results)
  -> HighLevel
```

What changes from the handoff:
- I'm not adopting the full offline lifecycle candidate. I'll reuse its sound parts (fail-closed token core, encryption envelope, single-writer claim) inside one small token manager that only `ghl-contacts` and the refresh job use. That cuts the scope to about a third.
- I'll use native n8n workflow tools instead of the MCP client, because MCP doesn't reliably pass per-request headers.
- The old shared-secret proxy is blocked for `/contacts*` once v2 is live, so it can't get around the new checks.

## One refresh authority
- The token manager is the only code that refreshes tokens, with a database lease plus a generation counter.
- The 12-hour cron, the manual "Refresh" button, and the proxy's lazy refresh all go through the manager. None of them write tokens directly anymore.
- If a refresh result is unclear (timeout or failed save), the installation is marked "needs attention". No retry loop, and old token snapshots are never restored.
- What gets proved: live reads work and one supervised refresh works. A rotation of the derived Location refresh token is only proved if it actually happens during the pilot. I'll report this separately.

## Decisions I need from you
1. **HighLevel permission (blocking).** Your connection is Company-level, so contacts need a Company-to-Location exchange, which needs `oauth.write`. We haven't confirmed the current grant has it. Options:
   - (a) I run one read-only check now. If `oauth.write` is missing, you add it to the Marketplace app's scopes and reinstall/reauthorize location YZQCL96jxM5knY233VD4.
   - (b) Change the app to install at Location level (simpler tokens, but every sub-account must reinstall).
   I recommend (a).
2. **One exchange call.** With your approval, I run a single real Company-to-Location exchange for installation 7a1087ef. It's needed for the first live contacts read.
3. **Downtime.** Cutover means turning the legacy HighLevel API workflow off and CMS v2 on, and pointing your profile's custom webhook at v2. Legacy MCP routes and the notification webhook (`/webhook/9e16570c…`) stop unless I copy the notification branch into v2 first. Recommendation: move notifications into v2 before cutover (about 1 hour extra), or accept notification downtime. Which do you prefer?
4. **New shared secret.** I create a new signing secret, saved both in the backend and as a new n8n credential. The existing shared credential stays untouched for other users of it.
5. **Cost.** Publishing the frontend change to ixty.ai needs an active paid Lovable plan. The backend functions and n8n changes work without it, and you can test on iai-spark.lovable.app. Backend usage cost is negligible.

## Rollback
Turn the v2 webhook off and point the profile back to the legacy URL. The contacts fence and the single refresh authority stay in place, so rollback won't reopen the bypass or the competing refreshers. During rollback, legacy contact tool calls fail safely instead of working.

## Material from IT Helper (optional)
Only `review-20261109/work/proposal/`, and only its typed contacts service plus the normalization/validation module, with no execution exports. If it doesn't arrive, I'll rebuild that part from the CMS v2 workflow's existing validation.

## Technical steps
1. Re-check drift: workflow activation, the profile webhook, installation metadata.
2. Migration: `ghl_installations` gets token_class, scopes, refresh lease/generation, and an encrypted derived-location credential. Service-only RLS.
3. Edge functions: `chat-relay`, `ghl-contacts`, and a shared `_shared/ghl-token-manager.ts`. Re-point `ghl-token-refresh`, the cron, and the `ghl-api-proxy` refresh to the manager. Fence `/contacts*` in the proxy.
4. Frontend: when the backend is n8n and you're signed in, `message-processor` sends through `chat-relay` (same pattern as hermes-provider). Anonymous chat is unchanged.
5. n8n v2: webhook ingress verifies the actor pass, adds the two native tools that call `ghl-contacts`, keeps existing validation, and redacts the pass from logs.
6. Tests for each rule: expired/forged pass rejected, wrong installation owner rejected, search/get only, no writes, one refresher wins the lease.
7. Pilot as jleemc44 in the real app: search, then get, with matching correlation IDs in relay, n8n and ghl-contacts logs.
