# Spec: Paginated memo lists

Status: ready-for-agent

> Reference spec for the feature. Decisions here are the contract the implementation
> follows. Companion documents: `docs/adr/0006-a-pin-belongs-to-its-scope.md` (the order a
> scope lists its memos in), `docs/adr/0008-memo-lists-paginate-by-keyset-cursor.md` (keyset pagination).
> Domain vocabulary: `GLOSSARY.md` (**Memo**, **Scope**, **Space**, **Explore**, **Pin**,
> **Featured**).

## Problem Statement

Every memo list in Plume loads all of its memos at once. Opening the personal scope, a
space or Explore fetches every root memo in it, each with its attachments, its reactions
and its comment count, and renders them all. The cost grows without bound:

- **Explore** grows with every author on the instance, not with the reader. It is the
  page a newcomer sees first, without signing in, and it gets slower for everyone each
  time anyone publishes.
- A writer who uses Plume daily accumulates thousands of memos in their personal scope.
  Each visit downloads all of them to show the first five.
- A space grows with every member.

The database side is no better. No index serves the order a list is read in (pinned or
featured first, then newest first), so Postgres reads and sorts the whole scope on every
request. The only read index on memos, for spaces, ignores pins.

Nobody has measured any of this. There is no data set large enough to show the problem,
and no number to say whether a change fixes it.

## Solution

Every memo list loads in pages of 20 memos and loads the next page as the reader scrolls
near the end, the way timeline apps do. The order a reader sees does not change: pinned
memos first in a scope, featured memos first on Explore, then newest first.

- Scrolling is continuous: the next page is requested shortly before the reader reaches the
  last loaded memo, so in the common case they never wait. If loading fails, a
  "Load more" button appears in place of the automatic loading so the reader can retry.
- A memo created, pinned or deleted while someone scrolls never makes another memo appear
  twice or disappear from the list.
- Opening a memo and coming back puts the reader where they were, with the memos they had
  loaded.
- The list stays usable with a keyboard and a screen reader: it is announced as a feed,
  each memo is an article with its position, and the arrival of new memos is announced.
- Filtering by tag or date, or searching, restarts the list from its first page.

The change is backed by measurement: a reproducible benchmark that seeds a large data set
and records response size, response time and query plans for each list, before and after.
The results are committed to the repository.

## User Stories

1. As a visitor, I want Explore to show its first memos quickly, so that my first
   impression of Plume is not a loading screen.
2. As a visitor, I want Explore to keep loading memos as I scroll, so that I can browse
   without clicking through pages.
3. As a visitor who is not signed in, I want to scroll through all of Explore, so that
   pagination does not become a reason to sign up.
4. As a visitor, I want featured memos to remain first on Explore, so that pagination
   does not change what the operator chose to show first.
5. As a visitor, I want featured memos listed with the latest featured on top, then the
   other public memos newest first, so that the order is the one Explore already has.
6. As a writer, I want my personal scope to open quickly however many memos I have
   written, so that Plume stays fast as I use it more.
7. As a writer, I want my pinned memos to stay first in my personal scope, so that
   pagination does not bury what I chose to keep on top.
8. As a writer, I want to scroll back through all my memos, down to the first one I
   wrote, so that nothing becomes unreachable.
9. As a member of a space, I want the space's memos to load page by page, so that a busy
   space stays fast.
10. As a member of a space, I want the memos an admin pinned to stay first, so that the
    space's reference memos stay in front of everyone.
11. As a reader, I want the next memos to be loaded before I reach the end of the list, so
    that I rarely see a loading state.
12. As a reader, I want a visible loading state when I do reach the end before the next
    memos arrive, so that I know more is coming.
13. As a reader, I want a "Load more" button when loading the next memos fails, so that I
    can retry instead of being stuck at the end of a partial list.
14. As a reader, I want a clear end of the list when there are no more memos, so that I
    know I have seen everything.
15. As a reader, I want no memo to appear twice when someone writes a memo while I am
    scrolling, so that the list stays trustworthy.
16. As a reader, I want no memo to be skipped when someone deletes a memo while I am
    scrolling, so that I do not miss anything.
17. As a reader, I want a memo that gets pinned while I scroll to neither appear twice nor
    disappear, so that curation by someone else does not break my reading.
18. As a reader, I want memos written at the same instant to appear once each, in a stable
    order, so that the list never shuffles between pages.
19. As a reader, I want to open a memo and come back to the same place in the list, so that
    reading a memo does not cost me my position.
20. As a reader, I want the memos I had already loaded to still be there when I come back,
    so that I do not have to scroll through them again.
21. As a reader, I want filtering by tag to show the first page of matching memos, so that
    filters keep working with pagination.
22. As a reader, I want filtering by date to show the first page of matching memos, so that
    the calendar keeps working with pagination.
23. As a reader, I want search results to load page by page, so that a broad search stays
    fast.
24. As a reader, I want changing a filter to start the list from the top, so that I never
    see a mix of two filters' results.
25. As a reader, I want my reaction on a memo far down the list to show immediately, so
    that reacting feels the same everywhere in the list.
26. As a writer, I want the memo I just wrote to appear at the top of my list, so that
    pagination does not hide my new memo.
27. As a writer, I want a memo I delete to disappear from the list wherever it was loaded,
    so that the list reflects what exists.
28. As an author, I want pinning or unpinning a memo to move it to its place in the list,
    so that the pin takes effect without reloading the page.
29. As an operator, I want featuring or unfeaturing a memo to move it on Explore, so that
    my decision is visible at once.
30. As a keyboard user, I want to move through the list and reach newly loaded memos with
    the keyboard, so that infinite scrolling does not trap me.
31. As a screen reader user, I want the list announced as a feed of memos with their
    positions, so that I know where I am in it.
32. As a screen reader user, I want to hear that new memos were loaded, so that the change
    in the page is not silent.
33. As a keyboard user, I want the "Load more" button to be reachable and operable, so that
    I can retry a failed load without a pointer.
34. As a reader on a slow connection, I want each request to carry only a page of memos, so
    that the list starts showing quickly.
35. As a reader on a phone, I want the list to load and scroll smoothly, so that Plume is
    usable on the go.
36. As a developer, I want a command that seeds a large data set and measures each list,
    so that I can see the effect of a change on performance.
37. As a developer, I want the benchmark to run against a disposable database, so that it
    never touches real data and runs anywhere Docker runs.
38. As a developer, I want the before and after results committed in the repository, so
    that the improvement is documented and can be reproduced.
39. As a developer, I want the query plan of each list recorded, so that I can check an
    index is actually used.
40. As a developer, I want a cursor from one list to be refused by another, and a forged
    cursor to be refused cleanly, so that pagination cannot be used to read outside a
    scope.
41. As a developer, I want the page size decided by the server, so that a client cannot
    request an unbounded page and bring back the original problem.
42. As a reviewer, I want each pull request to cite its measured numbers, so that the
    performance claim is backed by evidence.

## Implementation Decisions

### Scope of the change

- Three lists are paginated, with one shared mechanism: the personal scope, a space, and
  Explore. Their row shape is already identical; they differ by their filter and their
  order.
- Comments are not paginated. Their list already accepts a limit and a thread is short by
  nature.

### API contract

- The three list procedures (personal, space, public) keep their filters (date, tag,
  query) and accept an optional `cursor`. Without one, they return the first page.
- They return `{ items, nextCursor }`, where `nextCursor` is null when the list is
  exhausted. This replaces the bare array returned today: a breaking change, so the
  server and the web client change together for each list.
- The page size is fixed by the server at 20. The client does not choose it. If a
  `limit` is ever accepted, it is capped server side.
- The cursor is opaque to the client: an encoded token, not fields the client builds.

### Keyset pagination

- Pagination is by cursor (keyset), not by offset. With an offset, a memo inserted,
  pinned or deleted between two requests shifts every following row, producing duplicates
  or gaps, and the cost of a page grows with its depth. A keyset cursor resumes "after the
  last memo seen" in the list's exact sort key. The trade-off: no jumping to page N, which
  an infinite list does not need. Recorded in ADR 0008.
- The cursor encodes the full sort key of the last memo of the page:
  - in a scope (personal or space): `(pinnedAt, createdAt, id)`, for the order pinned
    first, latest pin on top, then newest first (ADR 0006);
  - on Explore: `(featuredAt, createdAt, id)`, for the order featured first, latest
    featured on top, then newest first.
- `id` breaks ties between memos created at the same instant, so the order is total and no
  memo can be skipped or repeated at a page boundary.
- The keyset condition must respect `NULLS LAST` on the pin and featured columns: a cursor
  taken among pinned memos continues through the remaining pinned memos, then through all
  unpinned memos. A cursor taken among unpinned memos never returns to pinned ones.
- A cursor carries which list it belongs to. A cursor from another list, a malformed
  cursor or a tampered one is rejected as a bad request. The scope condition is always
  applied on top of the cursor: a cursor never widens what a reader may see.
- Attachments and reactions are fetched for the page's memos only, as they are today for
  the whole list.

### Indexes

- One index per list, matching its sort key exactly and partial on root memos (only root
  memos are listed):
  - personal scope: by author, then the scope order;
  - space: by space, then the scope order (replacing or complementing the existing
    space index, whichever the query plans show is right);
  - Explore: public root memos, in Explore's order.
- Schema change through the usual path: schema edit, generated migration committed, then
  migrate.
- Each index is justified by an `EXPLAIN ANALYZE` before and after, recorded in the
  performance note.
- First, outside pagination: an index on `memo.parent_id`. The "before" plans show the
  comment count of each listed memo scanning the whole `memo` table, over 95% of every
  list's time, because the foreign key has no index. It comes first so that it does not
  hide the effect of pagination and of the list indexes in their own measurements.

### Web client

- The three list hooks move to infinite queries. The routes stay thin: they compose the
  hook and the list component.
- The list is rendered as an ARIA feed: the container has `role="feed"`, each memo is an
  `article` with `aria-posinset` and `aria-setsize` (unknown until the list is exhausted),
  and `aria-busy` is set while a page loads. A polite live region announces how many memos
  were loaded.
- Loading is automatic: an `IntersectionObserver` on a sentinel near the end of the list
  requests the next page while about 5 memos remain to be read.
- On a failed load, a real "Load more" button replaces the automatic trigger. It is
  focusable and keyboard operable.
- A clear end of list is shown when `nextCursor` is null.
- Filters are part of the query key, so changing a filter starts a fresh list from its
  first page.
- After a mutation (create, delete, pin, unpin, feature, unfeature, move), the existing
  invalidation of memo queries is kept: simple and always correct. The number of pages
  kept, and thus refetched, is bounded with `maxPages`. Surgical cache updates are not
  done unless measurement shows refetching is a problem.
- The optimistic reaction update rewrites the paginated cache shape (pages of items)
  instead of a flat array, and still rolls back on error.
- Scroll restoration: coming back to a list from a memo restores both the loaded pages
  (from the query cache) and the scroll position.

### Measurement

- A seed script creates a realistic data set, along the lines of the showcase seed: about
  2,000 personal memos for one writer, a space with a comparable volume, and about 10,000
  public memos across many authors, with tags, attachments, reactions, comments, a few
  pins and a few featured memos.
- A benchmark command (`pnpm bench:lists`) runs against a disposable Postgres started with
  Testcontainers, like the integration tests. For each list it measures response size,
  response time (median and p95 over several runs) and the query plan.
- Results go in a performance note under `docs/performance/` covering the memo lists:
  the method, the data set, and a before and after table. Each pull request adds its
  numbers to the note and cites them in its description.
- The benchmark is a tool, not a test: it makes no assertion and does not run in CI, so
  timing noise never fails a build.

### Delivery

- The work is split into tickets, written separately: first the measurement baseline
  (seed, benchmark, "before" numbers, no behavior change); then the index on
  `memo.parent_id` the baseline showed was missing; then Explore paginated end to end,
  which builds the shared mechanism; then the personal scope and spaces on the same
  mechanism.

## Testing Decisions

- Tests exercise external behavior only: what a caller of a list procedure gets back, and
  what a reader sees and can do in the browser. The cursor encoding, the keyset SQL and
  the cache rewrite are implementation details, covered through these two seams and never
  tested directly, so they can be refactored freely.
- **Server seam: the tRPC caller against a real Postgres** (Testcontainers), for each of
  the three lists:
  - walking every page returns exactly the full list, in order (pinned or featured first,
    then newest first), with no duplicate and no gap, across a page boundary that falls
    inside the pinned or featured block and one that falls after it;
  - a memo created, pinned, unpinned or deleted between two page requests causes no
    duplicate and no skipped memo among the rest;
  - memos sharing the same creation instant are each returned exactly once;
  - each filter (tag, date, query) combines with the cursor;
  - the last page has no next cursor, and an empty list returns no items and no cursor;
  - a malformed cursor, and a cursor from another list, are refused as a bad request;
  - a cursor never reveals a memo outside the reader's scope (for example, another user's
    private memo, or a space the reader is not a member of);
  - Explore paginates for an anonymous reader.
  - Prior art: the featured memos, pinned memos and space memos integration tests, which
    seed users, spaces and memos directly and call procedures as a given user.
- **Browser seam: Playwright** end-to-end tests, for what exists only in the browser:
  - scrolling to the end loads the next page;
  - a failed page load shows "Load more", and using it loads the page;
  - opening a memo then going back restores the loaded memos and the scroll position;
  - reacting to a memo on the second page updates its reaction summary at once.
  - Prior art: the existing memos end-to-end spec.
- Definition of done as usual: lint, typecheck and the Vitest suite pass; the end-to-end
  tests above pass when run on demand.

## Out of Scope

- **Virtualization** (rendering only the memo cards on screen). It solves a different
  problem, the browser's cost of a very long list, rather than network and database cost.
  With cards of variable height it complicates height measurement, scroll restoration and
  the browser's find in page. Revisit only if measurement shows rendering degrades after
  several hundred loaded memos; that would be its own ticket.
- **Jumping to a page by number**, or shareable page URLs. Search and filters are the way
  to find a specific memo.
- **A "N new memos" banner** for memos written by others while reading. New memos appear
  after the next refetch, as today.
- **Paginating comments.**
- **Surgical cache updates** after mutations, unless measurement shows that refetching the
  loaded pages is a problem.
- **Paginating derived views** (tags in the sidebar, stats, calendar). They are separate
  queries and are not affected.

## Further Notes

- Explore is the priority: it is the only list whose size does not depend on the reader,
  and it is public, so it is the first to degrade and the most visible when it does.
- The order of each list is unchanged and remains defined by ADR 0006 (scopes) and the
  featured memos spec (Explore). The cursor takes that order as its key; it does not
  redefine it.
- "Feed" is the ARIA role of the list only. The domain term remains **Explore**, and
  "feed" stays a term to avoid in domain language: components and tickets name the lists
  after their scope.
