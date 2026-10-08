# 04: A user turns off comment emails

**What to build:** In the Notifications section, a user flips one switch — "Email me when someone comments on my memos", on by default — and stops receiving comment emails at once, including for comments posted just before. In-app notifications keep arriving. Every comment email ends with a link to manage notifications, which opens the Notifications section (after signing in if needed).

See spec: `.scratch/settings/spec.md` — "Notifications — preference", user stories 28–33.

**Blocked by:** 01 (The settings page, and a user edits their name)

**Status:** ready-for-agent

- [ ] New table `user_preference` (user id as primary key with a cascading foreign key, `comment_emails` boolean not null default true, `updated_at`), with its generated migration committed; no backfill — a missing row means defaults
- [ ] tRPC `preferences.get` returns defaults when there is no row; `preferences.update` upserts
- [ ] The comment email reaction reads the preference at send time, during the drain
- [ ] The comment email contains a link to `/settings/notifications`, built from the web URL the server already uses for invitation links
- [ ] The switch lives in the `notifications` web feature and is composed by the Notifications route
- [ ] Integration test (tRPC caller): defaults read when no row exists; an update is read back
- [ ] Integration test (outbox drain): no email when turned off, while the in-app notification is still created; an email when no row exists; turning it off after the event was written still stops the email; the email contains the settings link
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
