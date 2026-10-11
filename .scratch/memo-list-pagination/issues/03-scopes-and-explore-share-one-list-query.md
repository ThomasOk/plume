# 03: Scopes and Explore share one list query

**What to build:** A prefactor with no visible change. Listing a scope's memos and listing
Explore's memos select the same row (memo, author, comment count) and hydrate it the same
way (attachments, reactions); they differ only by which memos qualify and in what order.
Make that one query, taking its condition and its order as parameters, so that the cursor
of ticket 04 is written once and the personal scope and spaces inherit it. See the spec,
`.scratch/memo-list-pagination/spec.md`, sections *Scope of the change* and *Keyset
pagination*.

- The order stays defined where it is today: pinned first in a scope (ADR 0006), featured
  first on Explore. The shared query takes it, it does not redefine it.
- Explore keeps ignoring pins, and keeps working for a reader who is not signed in.
- Procedure signatures and return shapes are unchanged.

**Blocked by:** None (can start immediately, alongside 01).

**Status:** ready-for-agent

- [ ] One function builds and hydrates every list of root memos; the scope and Explore lists are thin callers of it
- [ ] The existing memo, scope, space, pinned and featured integration tests pass without modification
- [ ] No change to any procedure's input or output
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass
