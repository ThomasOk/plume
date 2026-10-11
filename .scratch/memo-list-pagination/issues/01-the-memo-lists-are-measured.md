# 01: The memo lists are measured

**What to build:** A developer runs one command and gets, for each memo list (the personal
scope, a space, Explore), how big its response is, how long it takes and how Postgres
executes it, on a data set large enough to show the problem. The results are committed as
the "before" numbers that every following ticket compares against. Nothing a reader sees
changes. See the spec, `.scratch/memo-list-pagination/spec.md`, section *Measurement*.

- A seed builds a realistic data set, along the lines of the showcase seed: about 2,000
  personal memos for one writer, a space with a comparable volume, and about 10,000 public
  memos across many authors, with tags, attachments, reactions, comments, a few pins and a
  few featured memos.
- `pnpm bench:lists` starts a disposable Postgres through Testcontainers (as the
  integration tests do), applies the migrations, seeds, then calls each list procedure as
  its reader would and records response size, median and p95 time over several runs, and
  the `EXPLAIN ANALYZE` of each list query.
- A performance note under `docs/performance/` describes the method, the data set and the
  machine, and holds a before/after table per list, with the "before" column filled.
- The benchmark is a tool, not a test: no assertion, not part of `pnpm test`, not run in CI.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `pnpm bench:lists` runs from a clean checkout with only Docker running, and never touches a database it did not start
- [ ] It reports size, median and p95 for the personal scope, a space and Explore, and prints each query plan
- [ ] The seed is deterministic, so two runs measure the same data
- [ ] The performance note records the method, the data set and the "before" numbers and plans
- [ ] `pnpm test` neither runs nor depends on the benchmark
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass
