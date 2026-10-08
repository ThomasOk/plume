# 06: The Former user exists and is never notified

**What to build:** Plume gains the **Former user**, the author that memos and comments pass to when they outlive a deleted account. It is shown as "Deleted user", can never sign in, and is never a member of a space. A comment under a memo the Former user holds creates no in-app notification and sends no email. Nothing reassigns to it yet — that comes with account deletion — but the rule is verifiable on its own.

See spec: `.scratch/settings/spec.md` — "Former user", user story 60. ADR 0003 (account deletion).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A migration inserts the Former user row: fixed id `former-user` exported from the db package, name "Deleted user", email `former-user@plume.invalid`, no `account` row
- [ ] The comment recipient policy shared by the notification and email reactions returns "don't react" when the recipient is the Former user
- [ ] Integration test (outbox drain): a comment under a memo whose author is the Former user produces neither a notification nor an email
- [ ] Integration test helpers that wipe the `user` table keep working (the Former user is re-inserted or spared where tests need it)
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
