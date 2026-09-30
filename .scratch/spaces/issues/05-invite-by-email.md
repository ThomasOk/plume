# 05 — Invite someone to a Space by email

**What to build:** A Space becomes genuinely multi-user. An admin invites an email address
— including one with no Plume account — the invitee receives a link, follows it, and
becomes a Member.

The Invitation is its own entity with its own lifecycle: created, then accepted (it ceases
to exist and a Membership is born, in one transaction), or expired, or revoked. It is
**not** a status column on the membership row. That merge, which the reference
implementation uses, only works because it invites existing users only: an Invitation
addresses an email, which may belong to no User at all, so there is no User to key the row
on.

Security — the load-bearing decision of this ticket:

- The token is cryptographically random, stored **hashed**, single-use, and expires. A leak
  of the table must not yield live Invitations.
- **The token is the credential, not the email match.** Auth runs with email verification
  disabled, so accepting by comparing the signed-in account's email to the invited address
  would let anyone claim a colleague's Invitation by signing up with their address. Holding
  the link is what grants the Membership.

Delivery, which must not touch existing code:

- Creating an Invitation records a domain event in the outbox **in the same transaction**,
  following the established pattern.
- A new subscriber sends the email through the existing sender port, keyed for idempotency
  by the outbox row id, exactly as the comment email does.
- Adding this is a new event type and a new subscriber. **No existing producer or handler is
  modified** — that is the whole claim of the outbox ADR, and this ticket is where it gets
  demonstrated rather than restated.
- Email only. No in-app notification: the notification entity references a Memo by foreign
  key, and generalising that column is a separate modelling decision.

Acceptance flows: signed in, signed out with an account, and signed out with no account —
the last one carries the token through sign-up without losing it.

**Blocked by:** 03 — Write, read and comment on Memos in a Space.

**Status:** ready-for-agent

- [ ] An admin invites an email address and chooses the Role granted on acceptance
- [ ] The token is stored hashed; the plaintext exists only in the link
- [ ] Exactly one email is sent per Invitation after the outbox drains
- [ ] Re-draining the same event sends no second email
- [ ] A failing send leaves the outbox row pending for retry; the Invitation is not lost
- [ ] An invitee already signed in accepts in one step and becomes a Member
- [ ] An invitee with an account but signed out accepts after signing in
- [ ] An invitee with no account signs up and lands in the Space, token intact
- [ ] Accepting with the correct token succeeds regardless of the accepting account's email
- [ ] A used token is refused
- [ ] An expired token is refused, with a message that says so
- [ ] A revoked Invitation cannot be accepted
- [ ] An admin sees pending Invitations and can revoke one
- [ ] Inviting an address that is already a Member is refused with a clear reason
- [ ] Re-inviting an address with a pending Invitation replaces it — never two live links
- [ ] No existing producer or event handler is modified
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
