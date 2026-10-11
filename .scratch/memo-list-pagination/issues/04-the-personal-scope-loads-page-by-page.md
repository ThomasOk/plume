# 04: The personal scope loads page by page

**What to build:** A writer's personal scope opens with its first 20 memos however many
they have written, and loads the rest as they scroll, pinned memos still first, latest pin
on top, then newest first. Same behaviour as Explore after 03: continuous loading, "Load
more" on failure, end of list, position kept on return, keyboard and screen reader
support. See the spec, `.scratch/memo-list-pagination/spec.md`, ADR 0006 and ADR 0008.

- The personal list accepts the cursor and returns `{ items, nextCursor }`, through the
  mechanism built in 03. The cursor encodes `(pinnedAt, createdAt, id)`; the keyset
  condition honours `NULLS LAST` on `pinnedAt`.
- One partial index on the author's root memos in the scope order, through the usual
  schema change path; the migration is additive (ADR 0005).
- The personal list hook and its route move to the paginated list from 03.
- Writing a memo puts it at the top of the list; deleting one removes it wherever it was
  loaded; pinning or unpinning moves it to its place.
- Run `pnpm bench:lists` and fill the personal scope's "after" column and plan in the
  performance note; cite the numbers in the PR.

**Blocked by:** 03 (Explore loads page by page as the reader scrolls).

**Status:** ready-for-agent

- [ ] Walking every page returns exactly the writer's root memos in order, with no duplicate and no gap, across a page boundary inside the pinned block and one after it
- [ ] A memo written, pinned, unpinned or deleted between two page requests causes no duplicate and no skipped memo among the rest
- [ ] Memos sharing a creation instant are each returned exactly once
- [ ] Tag, date and query filters combine with the cursor
- [ ] A malformed cursor and a cursor from another list (Explore, a space) are refused as a bad request
- [ ] A cursor never yields another user's memo, nor a comment
- [ ] The query plan shows the new index used, recorded with the "after" numbers
- [ ] E2E: the personal scope loads its next page on scroll, and a new memo appears at the top
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass; `pnpm --filter web test:e2e` passes
