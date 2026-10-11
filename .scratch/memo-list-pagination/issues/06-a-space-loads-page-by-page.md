# 06: A space loads page by page

**What to build:** A space opens with its first 20 memos and loads the rest as its member
scrolls, the memos an admin pinned still first, latest pin on top, then newest first. Same
behaviour as Explore after 04. See the spec, `.scratch/memo-list-pagination/spec.md`,
ADR 0003, ADR 0004, ADR 0006 and ADR 0008.

- The space list accepts the cursor and returns `{ items, nextCursor }`, through the
  mechanism built in 04. The cursor encodes `(pinnedAt, createdAt, id)` and is bound to
  its space: a cursor issued for one space is refused in another.
- Membership is checked as today, before the cursor is read: a non-member gets nothing,
  whatever cursor they send (ADR 0004).
- Indexes: a partial index on the space's root memos in the scope order. Decide from the
  query plans whether it replaces the existing space index or complements it, and record
  the reason in the performance note. The migration is additive (ADR 0005); if the old
  index is dropped, say why in the PR.
- The space list hook and its route move to the paginated list from 04. Once 05 and this
  ticket are both done, no flat memo list remains in the reaction cache rewrite; drop the
  flat-list branch then if nothing else uses it.
- Run `pnpm bench:lists` and fill the space's "Paginated" column and plan in the performance
  note; cite the numbers in the PR.

**Blocked by:** 04 (Explore loads page by page as the reader scrolls). Can run alongside 05.

**Status:** ready-for-agent

- [ ] Walking every page returns exactly the space's root memos in order, with no duplicate and no gap, across a page boundary inside the pinned block and one after it
- [ ] A memo written, pinned, unpinned, moved out or deleted between two page requests causes no duplicate and no skipped memo among the rest
- [ ] Memos sharing a creation instant are each returned exactly once
- [ ] Tag, date and query filters combine with the cursor
- [ ] A cursor from another space, from the personal scope or from Explore is refused as a bad request
- [ ] A non-member is refused with or without a cursor
- [ ] The query plans justify the index decision, recorded with the "Paginated" numbers
- [ ] E2E: a space loads its next page on scroll
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass; `pnpm --filter web test:e2e` passes
