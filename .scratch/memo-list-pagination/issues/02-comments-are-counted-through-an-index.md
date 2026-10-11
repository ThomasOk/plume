# 02: Comments are counted through an index

**What to build:** An index on `memo.parent_id`, so that finding a memo's comments no
longer reads the whole `memo` table. Nothing a reader sees changes; every list gets faster.
See the performance note, `docs/performance/memo-lists.md`, section *Reading the "before"
plans*, and the spec, `.scratch/memo-list-pagination/spec.md`, section *Indexes*.

The "before" plans of ticket 01 show that over 95% of each list's time goes to its comment
count: every listed memo runs a subquery on `parent_id`, and with no index each run is a
sequential scan of every memo and comment (about 1.2 ms on the benchmark's data set,
repeated 10,411 times on Explore). Reading and sorting the list itself takes under 100 ms.

Done before pagination on purpose, so each step is measured alone: until the comment count
is cheap it hides everything else, and the list indexes of tickets 04 to 06 could not be
justified by their plans, since a page of 20 memos would still spend about 24 ms counting
comments against a fraction of a millisecond saved by the seek.

- A plain btree index on `parent_id`, named as the schema names its indexes
  (`memo_parent_id_idx`), with a comment saying which reads it serves. It also serves
  every other read of a memo's comments: listing them, carrying a memo's visibility over
  to its comments on edit, deleting a memo with its comments, and the `ON DELETE CASCADE`
  of the `parent_id` foreign key, which Postgres does not index on its own.
- A partial index (`WHERE parent_id IS NOT NULL`) would be about 40% smaller and still
  used. Prefer the plain one unless the plans show a difference worth the extra clause.
- Schema change through the usual path: schema edit, `pnpm db:generate`, generated
  migration committed, then migrate. The migration is additive (ADR 0005).
- Measurement: run `pnpm bench:lists`, fill the "Comments indexed" column of the three
  lists and add the three plans to the performance note, under their own heading; cite the
  numbers in the PR.

**Blocked by:** 01 (The memo lists are measured).

**Status:** ready-for-agent

- [ ] Every list query's plan counts comments through the index, not a sequential scan of `memo`
- [ ] The performance note records the numbers and plans of the three lists with the index
- [ ] No change to any procedure's input or output, nor to what a reader sees
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass
