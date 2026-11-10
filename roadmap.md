# Roadmap — CMS v2 contacts search/get

- [x] Decisions: add oauth.write if missing; one exchange approved; accept notification downtime; signing secret
- [x] IXTY_ACTOR_SIGNING_SECRET saved (also must be entered in n8n as a new credential)
- [x] oauth.write granted via draft app; connection 8813a31c is derived_location
- [x] Migration: token_class, lease/generation (no stored agency credential — fallback exchange not possible)
- [x] _shared/ghl-token-manager.ts; cron/manual/proxy re-pointed
- [ ] Watch first real refresh Nov 11 ~12:00 UTC
- [ ] Fence /contacts* in ghl-api-proxy for pilot user
- [ ] chat-relay + ghl-contacts edge functions
- [ ] Frontend: signed-in n8n chat via chat-relay
- [ ] n8n CMS v2: verify actor pass, contacts_search/get tools
- [ ] Rule tests; pilot as jleemc44; cutover (legacy off, v2 on)
