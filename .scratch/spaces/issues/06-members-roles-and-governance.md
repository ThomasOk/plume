# 06 — Members, Roles and governance

**What to build:** A Space becomes governable. An admin sees who is in it, changes Roles,
removes people, renames and deletes the Space; any Member can leave; and a Space can never
end up with nobody able to govern it.

This is where the **space policy module** is born: the Role matrix as pure functions over
plain values, with **no database access**. A policy function that needs a database handle is
the signal that a fact was not resolved upstream. Tickets 02 to 05 only ever needed "is this
User a Member", which the Space procedure already answers; from here the matrix has real
content and belongs in one readable, testable place rather than spread across services.
Ticket 05 already needed "only an admin invites", so `space-policy.ts` exists with that one
rule (`mayManageMembership`); this ticket completes it. Ticket 05 also built the members page
(`/spaces/:id/members`) with the invite form and the pending Invitations; the Member list
joins it here.

The matrix:

| Action | `admin` | `member` |
| --- | --- | --- |
| Read the Space's Memos | yes | yes |
| Write a Memo in the Space | yes | yes |
| Edit or delete **their own** Memo | yes | yes |
| Edit **another Member's** Memo | **no** | no |
| Delete **another Member's** Memo | yes | no |
| Invite, remove, or change a Role | yes | no |
| Rename or delete the Space | yes | no |
| Leave the Space | yes, unless last admin | yes |

The dissymmetry between editing and deleting another Member's Memo is deliberate and
domain-level, not an oversight: deleting is **moderation** — removing unwanted content from
a Space one is responsible for. Editing would be **impersonation**, since the Memo would
keep its Author's byline over words they did not write, and the model has no way to record
that.

Lifecycle rules:

- Removing a Member, or a Member leaving, **leaves their Memos in the Space** with their
  byline intact. The Space owns its contents; departure is not a removal of work. They
  simply stop being a reader.
- The last admin can neither leave nor demote themselves. Both paths must be guarded — the
  invariant is "the Space always has an admin", not "leaving is checked".
- Deleting a Space deletes its Memos and their Comments, admins only, behind an explicit
  confirmation that names what is about to be destroyed.
- Governance actions are **absent** from a `member`'s interface, not present-and-failing. A
  User should not be offered what they cannot do.

Decided while implementing, beyond the above:

- The matrix is data — `may(role, action)` over one table — with `mayEditMemo` and
  `mayDeleteMemo` deciding from `{ isAuthor, role }` and `keepsAnAdmin` holding the
  invariant. The web client imports the same module, so the interface offers exactly what the
  server allows.
- Reading a Space is not asked of the matrix: it is what membership means, and
  `spaceProcedure` enforces it. Writing is: the write paths take a destination carrying the
  membership, and the service asks `writeMemo`, so a future Role that may not write is one
  cell to flip.
- Governance changes lock the Space row, then count admins and re-read the actor's Role.
  Without the lock, two admins leaving or demoting each other at once would each see two
  admins and both succeed.
- Moderation covers Comments too: they are Memos. It is offered on the Space page only — the
  page of one Memo does not know its Space — though the server allows it from either.
- The Member list stays admin-only, as the members page already was.

**Blocked by:** 05 — Invite someone to a Space by email.

**Status:** ready-for-agent

- [x] The policy module holds the matrix as pure functions, with no database access
- [x] Every cell of the matrix is covered by a table-driven unit test
- [x] An admin sees the Member list with Roles and the pending Invitations
- [x] An admin promotes a `member` to `admin`
- [x] An admin demotes another `admin` to `member`
- [x] An admin removes a Member, whose Memos stay in the Space with their byline
- [x] A `member` cannot invite, remove, or change a Role
- [x] A `member` is not shown the governance actions at all
- [x] An admin deletes another Member's Memo
- [x] An admin is refused when editing another Member's Memo
- [x] Any Member can leave, and immediately loses read access
- [x] The last admin cannot leave
- [x] The last admin cannot demote themselves
- [x] An admin renames the Space
- [x] An admin deletes the Space behind a confirmation; its Memos and Comments go with it
- [x] A removed Member's personal views are unaffected
- [x] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
