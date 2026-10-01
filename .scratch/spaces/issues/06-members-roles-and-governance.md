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

**Blocked by:** 05 — Invite someone to a Space by email.

**Status:** ready-for-agent

- [ ] The policy module holds the matrix as pure functions, with no database access
- [ ] Every cell of the matrix is covered by a table-driven unit test
- [ ] An admin sees the Member list with Roles and the pending Invitations
- [ ] An admin promotes a `member` to `admin`
- [ ] An admin demotes another `admin` to `member`
- [ ] An admin removes a Member, whose Memos stay in the Space with their byline
- [ ] A `member` cannot invite, remove, or change a Role
- [ ] A `member` is not shown the governance actions at all
- [ ] An admin deletes another Member's Memo
- [ ] An admin is refused when editing another Member's Memo
- [ ] Any Member can leave, and immediately loses read access
- [ ] The last admin cannot leave
- [ ] The last admin cannot demote themselves
- [ ] An admin renames the Space
- [ ] An admin deletes the Space behind a confirmation; its Memos and Comments go with it
- [ ] A removed Member's personal views are unaffected
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
