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
- [ ] Watch first real refresh Nov 11 ~12:00 UTC
- [ ] Pilot test as jleemc44 in the preview (needs the user — I can't sign in on this project)
- [ ] Fence /contacts* in ghl-api-proxy for pilot user — after app is published (published app has no signed note yet)
- [ ] Cutover (legacy off, v2 on) — needs app publish (ixty.ai needs active Lovable plan)
