# Fix "Connection Failed" after installing the draft HighLevel app

## What happened (from the logs, 12:39:14 UTC today)
1. HighLevel sent the user back to iai-spark. The sign-in exchange with HighLevel **succeeded**.
2. HighLevel's reply had **no location ID** in it. That usually means HighLevel issued an agency-level (Company) pass rather than a sub-account (Location) pass — likely because the draft version is set to allow agency installs.
3. iai-spark then looked for the "install" notice HighLevel sends separately, to get the location ID from there. It didn't find it and gave up.
4. **0.14 seconds later** the install notice arrived (location YZQCL96jxM5knY233VD4, company SiG1HYqc0WPja7ASTTAV, verified signature) and was saved as pending. It was just too late.

So two things combined: a timing race, and an agency-level pass with no location in it. Your existing connection (7a1087ef) was not touched.

## Plan
1. **Wait for the install notice instead of giving up.** When the location ID is missing, re-check for the pending install for up to about 10 seconds before failing. Fixes the race.
2. **Recognize which kind of pass HighLevel gave us.** Save whether it's agency (Company) or sub-account (Location), plus the permissions HighLevel actually granted, on the connection record.
3. **If it's an agency pass with `oauth.write`:** exchange it once for a sub-account pass for YZQCL96jxM5knY233VD4 (the exchange you already approved) and save that as the working connection. If `oauth.write` isn't actually granted, stop with a clear message instead of a vague error.
4. **Clearer error screen.** Show the real reason ("still waiting for HighLevel's install notice", "missing permission", etc.) instead of "non-2xx status code".
5. **Test, then you retry** the draft test install link once. I'll confirm in the logs and the connection record that the sub-account pass and `oauth.write` are present, then continue with the contacts work in the roadmap.

## Decisions for you
- Should the draft app stay **agency-installable**, or only sub-account? Sub-account-only would give a Location pass directly and skip step 3, but a Company pass is what we need for future multi-location use. My recommendation: keep agency, use the exchange.
- Retrying the install replaces the current working connection for this location. Notifications for this location may pause for under a minute during the retry.

## Technical details
- `ghl-oauth-callback`: bounded poll (e.g. 10 × 1s) on `ghl_installations` pending row by company/recency; read `userType`, `scope`, `companyId`, `locationId` from the token response.
- Company tokens: call `POST /oauth/locationToken` (Version 2021-07-28, form-encoded, `companyId`+`locationId`) using the reviewed token core's strict validation; store only the derived Location token for proxy use for now.
- Requires a small additive column for token class/scopes (migration — needs your approval with this plan), then redeploy `ghl-oauth-callback` only.
- The leftover pending row 2d7297cd from this attempt will be reused or cleaned up.
