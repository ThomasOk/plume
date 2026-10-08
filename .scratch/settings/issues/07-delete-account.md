# 07: A user deletes their account

**What to build:** In the Data section's danger zone, a user deletes their account. They are told what goes and what stays, type their email to confirm, and give their password — or, for an account without one, have signed in within the last 10 minutes, otherwise they are asked to sign in again. Their personal memos go, with every comment under them and their attachments' files. Their memos in a space, and their comments under another author's memo, stay, now shown as written by "Deleted user". If they are the last admin of a space with other members, deletion is refused and those spaces are listed; a space they are alone in is deleted with them, after a warning. Once deleted, they are signed out everywhere and land on sign-in. A deletion that fails half-way changes nothing.

See spec: `.scratch/settings/spec.md` — "Account deletion", user stories 45–61. ADR 0003 (the Former user, and why deletion runs in Plume's own transaction).

**Blocked by:** 01 (The settings page, and a user edits their name), 06 (The Former user exists and is never notified)

**Status:** ready-for-agent

- [ ] A tRPC mutation `account.delete`, not Better Auth's `deleteUser`; input: the confirmation email, and the password when the account has one
- [ ] Checks before any write: confirmation email matches case-insensitively; password verified with Better Auth's own password verification function when a credential account exists; otherwise the session must be under 10 minutes old, else a dedicated "re-authentication required" error
- [ ] In one transaction: lock memberships and spaces as the last-admin rule does; fail with a dedicated error mapped to `CONFLICT` carrying the spaces (id, name) where the user is the last admin with other members; delete spaces where the user is the only member; reassign to the Former user the user's space memos, their comments under another author's memo, and those memos' and comments' attachments; delete the user row
- [ ] Storage keys of every deleted attachment are collected in the transaction and removed after commit; a storage failure is logged and does not fail the deletion
- [ ] The confirmation screen: consequences explained, confirm button disabled until the email is typed exactly, password field only for credential accounts, the blocking spaces listed on a last-admin refusal, an invitation to sign in again on a re-authentication refusal; on success the client clears its session and goes to sign-in
- [ ] The authenticated caller test helper gains an option for the session's creation time
- [ ] Integration tests (tRPC caller), per the spec's Seam 1 list: personal memos and their comments gone; space memos and comments under others' memos held by the Former user; reassigned attachments still attached; deleted storage keys removed and storage failure tolerated; last-admin refusal changes nothing and names the spaces; sole-member space gone; wrong or missing password and mismatched email refused with nothing changed; stale versus recent session for an account without a password; sessions gone; a space admin can delete a Former-user memo
- [ ] Component tests: confirm disabled until the email matches; last-admin refusal lists the spaces; re-authentication refusal offers to sign in again
- [ ] ADR 0003's "No account deletion" consequence is rewritten to describe what was built
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
