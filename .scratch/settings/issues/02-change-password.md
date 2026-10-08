# 02: A user changes their password

**What to build:** In the Security section, a user who signs in with a password changes it by giving their current password and the new one twice, and may choose to sign out every other device at the same time. A wrong current password is refused with a clear message; the new password follows the sign-up minimum length. A user who signs in with Google sees no password form.

See spec: `.scratch/settings/spec.md` — "Security", user stories 14–20.

**Blocked by:** 01 (The settings page, and a user edits their name)

**Status:** ready-for-agent

- [ ] The form uses Better Auth's `changePassword` with `revokeOtherSessions` driven by a checkbox; no server code is added
- [ ] Whether the user has a password is read from their linked accounts: the form shows only when one is the credential provider
- [ ] Mismatched new passwords are caught before submitting; a wrong current password shows the error returned
- [ ] Component test: the form is absent for an account with no credential provider and present otherwise
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
