# Roadmap — CMS v2 contacts search/get

- [x] Decisions: add oauth.write if missing; one exchange approved; accept notification downtime; signing secret
- [x] IXTY_ACTOR_SIGNING_SECRET saved
- [x] oauth.write granted via draft app; connection 8813a31c is derived_location
- [x] Migration: token_class, lease/generation
- [x] _shared/ghl-token-manager.ts; cron/manual/proxy re-pointed
- [x] chat-relay + ghl-contacts edge functions deployed, rule tests pass
- [x] Frontend: signed-in chat via chat-relay (preview only until publish)
- [x] n8n CMS v2: reads via ghl-contacts with signed note; published (sub-workflow only)
- [x] Pilot chat workflow (jleemc44): "CMS v2 Contacts" tool added and published
- [x] Pilot test as jleemc44 in the preview (user: 3 contacts for "Joshua")
- [ ] Watch first real refresh Nov 11 ~12:00 UTC
- [ ] Plan step 1: confirm the Joshua run in logs
- [ ] Plan step 2: capability map of old HighLevel API workflow
- [ ] Slice A: contacts writes + "skip confirmations" switch in Settings > Integrations (off by default, server-checked)
- [ ] Slices B–D: conversations, calendars, opportunities
- [ ] Fence /contacts* in ghl-api-proxy for pilot user — after app is published
- [ ] Cutover (legacy off, v2 on) — Lovable plan reactivated; publish when a slice is ready
