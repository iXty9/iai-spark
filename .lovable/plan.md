# Accept public avatar reads and close the finding

## Assessment: yes, this is safe to keep public

Verified against the live storage policies:

- Writes are locked down: upload, update, and delete on `avatars` all require the first path segment to equal the caller's own user id, so nobody can overwrite or delete another user's avatar.
- Listing is restricted: the only SELECT policy on `avatars` is scoped to `authenticated` users reading their own folder, so the bucket cannot be enumerated by anonymous visitors.
- Public reads are limited to direct object URLs, which contain the owner's user id plus the file name. The user id is already visible to the app's clients, and avatar images are self-chosen public-facing profile pictures — no private data is inferable from the file itself.
- The `sounds` bucket stays private and unaffected.

Residual risk is the standard trade-off of any CDN-served avatar: an avatar URL, once known, stays fetchable without auth (including briefly after deletion, via cache). That is expected behaviour for profile images and is what makes avatars load fast in chat and admin lists without signed URLs.

Guardrail worth keeping in mind: the `avatars` bucket must never be used for anything other than profile images — no documents, exports, or attachments.

## What I will do

1. Mark the `avatars_bucket_missing_public_select` finding as ignored, with the rationale that public read is intentional while writes and listing remain owner-scoped.
2. Update the security memory so future scans treat public avatar reads as accepted, and record the rule that only profile images may live in that bucket.

No database or code changes are needed.
