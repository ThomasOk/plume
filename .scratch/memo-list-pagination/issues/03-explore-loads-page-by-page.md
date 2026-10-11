# 03: Explore loads page by page as the reader scrolls

**What to build:** Explore shows its first 20 memos, then loads the next ones as the reader
nears the end, in the order it already has: featured first, latest featured on top, then
newest first. Nothing repeats or goes missing when someone publishes, features or deletes
a memo meanwhile. Opening a memo and coming back returns the reader to where they were.
The list works with a keyboard and a screen reader. This ticket builds the mechanism the
personal scope and spaces reuse in 04 and 05. See the spec,
`.scratch/memo-list-pagination/spec.md`, and ADR 0008.

- **Contract**: the public list accepts an optional opaque `cursor` beside its filters and
  returns `{ items, nextCursor }`, `nextCursor` null once exhausted. The page size, 20, is
  the server's. The cursor encodes `(featuredAt, createdAt, id)` of the last memo and which
  list issued it; the keyset condition honours `NULLS LAST` on `featuredAt`. A malformed or
  foreign cursor is a bad request; the public condition always applies on top of it.
- **Index**: one partial index on public root memos in Explore's order, through the usual
  schema change path (edit, generate, commit the migration, migrate). The migration is
  additive (ADR 0005).
- **Web client**: the public list hook becomes an infinite query, with filters in its key
  so a filter change restarts from the first page, and a bounded `maxPages`. The list
  component renders an ARIA feed (`role="feed"`, each memo an `article` with
  `aria-posinset`/`aria-setsize`, `aria-busy` while loading, a polite live region
  announcing loaded memos). An `IntersectionObserver` sentinel requests the next page when
  about 5 memos remain. On failure, a focusable "Load more" button replaces the automatic
  trigger. A clear end of list shows when there is no next page. The route stays a thin
  composition.
- **Reactions**: the optimistic reaction rewrite recognises the paginated cache shape
  (pages of items) in addition to the flat list, which the personal scope and spaces still
  use until 04 and 05, and still rolls back on error.
- **Position**: coming back to Explore from a memo restores the loaded pages and the
  scroll position.
- **Mutations** keep invalidating memo queries as today.
- **Measurement**: run `pnpm bench:lists` and fill Explore's "after" column and plan in the
  performance note; cite the numbers in the PR.

**Blocked by:** 01 (The memo lists are measured), 02 (Scopes and Explore share one list query).

**Status:** ready-for-agent

- [ ] Walking every page of Explore returns exactly the full list in order, with no duplicate and no gap, across a page boundary inside the featured block and one after it
- [ ] A memo published, featured, unfeatured or deleted between two page requests causes no duplicate and no skipped memo among the rest
- [ ] Memos sharing a creation instant are each returned exactly once
- [ ] Tag, date and query filters combine with the cursor
- [ ] The last page has no next cursor; an empty Explore returns no items and no cursor
- [ ] A malformed cursor and a cursor from another list are refused as a bad request
- [ ] A cursor never yields a memo that is not public
- [ ] Explore paginates for a reader who is not signed in
- [ ] The query plan shows the new index used, recorded in the performance note with the "after" numbers
- [ ] E2E: scrolling to the end loads the next page; a clear end of list shows at the end
- [ ] E2E: a failed page load shows "Load more", reachable by keyboard, and using it loads the page
- [ ] E2E: opening a memo then going back restores the loaded memos and the scroll position
- [ ] E2E: reacting to a memo on the second page updates its reaction summary at once
- [ ] Reactions still update at once in the personal scope and spaces (flat lists)
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass; `pnpm --filter web test:e2e` passes
