# Memo lists: performance

What each memo list costs (the personal scope, a space, Explore): how big its response
is, how long it takes, and how Postgres executes its query. Measured before the lists were
paginated (ADR 0008), then again after each step (the comment count indexed, then each
list paginated with its index), so every change is judged against the same numbers.

## Method

`pnpm bench:lists` (source: `packages/api/bench/`) does the following:

1. starts a disposable `postgres:17` through Testcontainers, the image the integration
   tests use, and applies the migrations. It reads no connection string, so it cannot
   touch a database it did not start. Docker must be running.
2. seeds the data set below. The seed is deterministic (counters for identifiers, a fixed
   instant for dates, a seeded generator for every choice), so every run measures the same
   rows. It ends with `ANALYZE`, so the planner sees the data it reads.
3. calls each list procedure through the tRPC router, as its reader would: the personal
   scope as its writer, the space as a member, Explore as an anonymous visitor. No filter.
   Once a list is paginated, the call reads its first page, and Explore is measured a
   second time at page 100, to show what a page costs deep in the list.
   It runs with `NODE_ENV=production`, and refuses to run otherwise: in development every
   procedure waits a random 100 to 500 ms to mimic latency.
4. per list, makes 3 warm-up calls, then 30 measured calls, and reports their median and
   p95. The response size is the procedure's result serialized with superjson, as tRPC
   sends it.
5. records the SQL of the list query as it was sent and runs `EXPLAIN (ANALYZE, BUFFERS)`
   on it. Only the list query is explained: the queries that follow fetch the
   attachments and reactions of its rows by identifier.

The benchmark is a tool, not a test: it asserts nothing, is not part of `pnpm test` and
does not run in CI, so timing noise never fails a build. A run took about ten minutes
before the comment count was indexed, most of it in Explore's 33 calls. A run prints
Markdown; the sections below are pasted from it. Absolute times depend on the machine; compare columns
measured on the same one.

## Data set

- 220 users: one writer, 19 other members of one space, 200 authors on Explore.
- Personal scope: 2,000 memos by the writer, 20% of them public, 5 pinned.
- Space: 2,000 memos by its 20 members, 3 pinned.
- Explore: 10,000 public memos by the 200 authors, plus the writer's 411 public memos,
  6 featured.
- Around them: 20,916 comments (0 to 3 per memo), 32,426 reactions (0 to 5 per memo, by
  readers of the memo), 2,079 active attachments (on about 10% of memos), and 0 to 2
  hashtags per memo.
- 34,916 rows in `memo` in all, root memos and comments.

## Machine

Apple M4 Pro, 14 cores, 48 GB, macOS (Darwin 24.6.0, arm64). Node 22.19.0, PostgreSQL
17.9 in Docker with its default configuration.

## Results

### Personal scope (read by its writer)

| | Before | Comments indexed | Paginated |
| --- | ---: | ---: | ---: |
| Memos returned | 2,000 | 2,000 | |
| Response size | 1,642 KB | 1,642 KB | |
| Median | 2,350 ms | 39.9 ms | |
| p95 | 2,424 ms | 44.2 ms | |
| Queries | 3 | 3 | |

### Space (read by a member)

| | Before | Comments indexed | Paginated |
| --- | ---: | ---: | ---: |
| Memos returned | 2,000 | 2,000 | |
| Response size | 1,928 KB | 1,928 KB | |
| Median | 2,468 ms | 80.4 ms | |
| p95 | 2,620 ms | 138.9 ms | |
| Queries | 4 | 4 | |

### Explore (read by an anonymous visitor)

| | Before | Comments indexed | Paginated |
| --- | ---: | ---: | ---: |
| Memos returned | 10,411 | 10,411 | 20 |
| Response size | 9,957 KB | 9,957 KB | 19 KB |
| Median | 12,965 ms | 387.9 ms | 1.7 ms |
| p95 | 13,083 ms | 512.2 ms | 2.0 ms |
| Queries | 3 | 3 | 3 |

"Paginated" is the first page. Page 100, resumed from the cursor that follows 1,980 memos,
costs the same: 20 memos, 19 KB, 1.7 ms median, 1.8 ms p95, 3 queries.

## Reading the "before" plans

- **The comment count dominates every list.** Each listed memo runs the `comment_count`
  subquery, and with no index on `memo.parent_id` each run is a sequential scan of the
  whole `memo` table: about 1.2 ms, repeated 2,000 times in a scope and 10,411 times on
  Explore. That is 3.5 million buffer hits for a scope and 18 million for Explore, and over
  95% of each list's execution time. Reading and sorting the rows themselves takes 60 to
  85 ms.
- **No index serves a list's order.** The personal scope and Explore read `memo` by a
  sequential scan, and all three sort the whole scope on `pinned_at` or `featured_at`
  then `created_at`. Explore's sort spills to disk (`external merge`, 4 MB). The space
  uses `memo_space_id_created_at_idx` only to find the space's rows, then sorts them, since
  the index ignores pins and comments.
- **The response grows with the list.** Explore sends 10 MB to a visitor who reads the
  first few memos.

Paginating would bound the subquery to the 20 memos of a page, but each run would stay a
scan of the whole table until `memo.parent_id` is indexed. That index comes first, before
pagination, so that each step is measured alone: until the comment count is cheap, it
hides the effect of everything else.

## "Before" query plans

Run of 2026-10-11, data set and machine above.

### Personal scope

```sql
select "memo"."id", "memo"."user_id", "memo"."parent_id", "memo"."content", "memo"."tags", "memo"."visibility", "memo"."space_id", "memo"."pinned_at", "memo"."featured_at", "memo"."created_at", "memo"."updated_at", (SELECT COUNT(*)::int FROM memo AS comments WHERE comments.parent_id = memo.id) as "comment_count", "user"."name", "user"."image" from "memo" left join "user" on "memo"."user_id" = "user"."id" where (("memo"."user_id" = $1 and "memo"."space_id" is null) and "memo"."parent_id" is null) order by "memo"."pinned_at" DESC NULLS LAST, "memo"."created_at" desc
```

```
Nested Loop Left Join  (cost=3050.90..3540479.90 rows=1620 width=436) (actual time=63.976..2395.316 rows=2000 loops=1)
  Buffers: shared hit=3495785
  ->  Gather Merge  (cost=3050.90..3235.53 rows=1620 width=390) (actual time=62.092..63.148 rows=2000 loops=1)
        Workers Planned: 1
        Workers Launched: 1
        Buffers: shared hit=1783
        ->  Sort  (cost=2050.89..2053.27 rows=953 width=390) (actual time=55.666..55.903 rows=1000 loops=2)
              Sort Key: memo.pinned_at DESC NULLS LAST, memo.created_at DESC
              Sort Method: quicksort  Memory: 779kB
              Buffers: shared hit=1783
              Worker 0:  Sort Method: quicksort  Memory: 40kB
              ->  Parallel Seq Scan on memo  (cost=0.00..2003.74 rows=953 width=390) (actual time=54.068..55.117 rows=1000 loops=2)
                    Filter: ((space_id IS NULL) AND (parent_id IS NULL) AND (user_id = 'bench-writer'::text))
                    Rows Removed by Filter: 16458
                    Buffers: shared hit=1747
  ->  Materialize  (cost=0.00..6.77 rows=1 width=58) (actual time=0.000..0.000 rows=1 loops=2000)
        Buffers: shared hit=2
        ->  Seq Scan on "user"  (cost=0.00..6.76 rows=1 width=58) (actual time=0.029..0.029 rows=1 loops=1)
              Filter: (id = 'bench-writer'::text)
              Rows Removed by Filter: 1
              Buffers: shared hit=2
  SubPlan 1
    ->  Aggregate  (cost=2183.45..2183.47 rows=1 width=4) (actual time=1.165..1.165 rows=1 loops=2000)
          Buffers: shared hit=3494000
          ->  Seq Scan on memo comments  (cost=0.00..2183.45 rows=2 width=0) (actual time=0.648..1.164 rows=2 loops=2000)
                Filter: (parent_id = memo.id)
                Rows Removed by Filter: 34914
                Buffers: shared hit=3494000
Planning Time: 0.071 ms
JIT:
  Functions: 19
  Options: Inlining true, Optimization true, Expressions true, Deforming true
  Timing: Generation 0.558 ms (Deform 0.289 ms), Inlining 36.015 ms, Optimization 40.401 ms, Emission 31.737 ms, Total 108.711 ms
Execution Time: 2396.037 ms
```

### Space

```sql
select "memo"."id", "memo"."user_id", "memo"."parent_id", "memo"."content", "memo"."tags", "memo"."visibility", "memo"."space_id", "memo"."pinned_at", "memo"."featured_at", "memo"."created_at", "memo"."updated_at", (SELECT COUNT(*)::int FROM memo AS comments WHERE comments.parent_id = memo.id) as "comment_count", "user"."name", "user"."image" from "memo" left join "user" on "memo"."user_id" = "user"."id" where ("memo"."space_id" = $1 and "memo"."parent_id" is null) order by "memo"."pinned_at" DESC NULLS LAST, "memo"."created_at" desc
```

```
Gather Merge  (cost=3008.76..4459698.54 rows=2041 width=436) (actual time=95.801..2647.392 rows=2000 loops=1)
  Workers Planned: 1
  Workers Launched: 1
  Buffers: shared hit=3494360
  ->  Sort  (cost=2008.75..2011.75 rows=1201 width=432) (actual time=82.152..82.382 rows=1000 loops=2)
        Sort Key: memo.pinned_at DESC NULLS LAST, memo.created_at DESC
        Sort Method: quicksort  Memory: 850kB
        Buffers: shared hit=360
        Worker 0:  Sort Method: quicksort  Memory: 25kB
        ->  Hash Left Join  (cost=159.81..1947.32 rows=1201 width=432) (actual time=81.277..81.533 rows=1000 loops=2)
              Hash Cond: (memo.user_id = "user".id)
              Buffers: shared hit=353
              ->  Parallel Bitmap Heap Scan on memo  (cost=150.84..1935.13 rows=1201 width=390) (actual time=81.191..81.351 rows=1000 loops=2)
                    Recheck Cond: (space_id = 'bench-space'::text)
                    Filter: (parent_id IS NULL)
                    Rows Removed by Filter: 1518
                    Heap Blocks: exact=275
                    Buffers: shared hit=312
                    ->  Bitmap Index Scan on memo_space_id_created_at_idx  (cost=0.00..150.33 rows=5072 width=0) (actual time=0.245..0.245 rows=5036 loops=1)
                          Index Cond: (space_id = 'bench-space'::text)
                          Buffers: shared hit=36
              ->  Hash  (cost=6.21..6.21 rows=221 width=58) (actual time=0.045..0.046 rows=221 loops=2)
                    Buckets: 1024  Batches: 1  Memory Usage: 21kB
                    Buffers: shared hit=8
                    ->  Seq Scan on "user"  (cost=0.00..6.21 rows=221 width=58) (actual time=0.016..0.028 rows=221 loops=2)
                          Buffers: shared hit=8
  SubPlan 1
    ->  Aggregate  (cost=2183.45..2183.47 rows=1 width=4) (actual time=1.276..1.276 rows=1 loops=2000)
          Buffers: shared hit=3494000
          ->  Seq Scan on memo comments  (cost=0.00..2183.45 rows=2 width=0) (actual time=0.787..1.275 rows=2 loops=2000)
                Filter: (parent_id = memo.id)
                Rows Removed by Filter: 34914
                Buffers: shared hit=3494000
Planning:
  Buffers: shared hit=4
Planning Time: 0.158 ms
JIT:
  Functions: 36
  Options: Inlining true, Optimization true, Expressions true, Deforming true
  Timing: Generation 0.798 ms (Deform 0.479 ms), Inlining 34.457 ms, Optimization 70.604 ms, Emission 57.035 ms, Total 162.894 ms
Execution Time: 2648.144 ms
```

### Explore

```sql
select "memo"."id", "memo"."user_id", "memo"."parent_id", "memo"."content", "memo"."tags", "memo"."visibility", "memo"."space_id", "memo"."pinned_at", "memo"."featured_at", "memo"."created_at", "memo"."updated_at", (SELECT COUNT(*)::int FROM memo AS comments WHERE comments.parent_id = memo.id) as "comment_count", "user"."name", "user"."image" from "memo" left join "user" on "memo"."user_id" = "user"."id" where ("memo"."visibility" = $1 and "memo"."parent_id" is null) order by "memo"."featured_at" DESC NULLS LAST, "memo"."created_at" desc
```

```
Gather Merge  (cost=3414.39..22741048.24 rows=10413 width=436) (actual time=89.778..12961.639 rows=10411 loops=1)
  Workers Planned: 1
  Workers Launched: 1
  Buffers: shared hit=18189841, temp read=499 written=500
  ->  Sort  (cost=2414.38..2429.69 rows=6125 width=432) (actual time=79.845..81.566 rows=5206 loops=2)
        Sort Key: memo.featured_at DESC NULLS LAST, memo.created_at DESC
        Sort Method: external merge  Disk: 3992kB
        Buffers: shared hit=1824, temp read=499 written=500
        Worker 0:  Sort Method: quicksort  Memory: 28kB
        ->  Hash Left Join  (cost=8.97..2029.10 rows=6125 width=432) (actual time=74.124..75.879 rows=5206 loops=2)
              Hash Cond: (memo.user_id = "user".id)
              Buffers: shared hit=1788
              ->  Parallel Seq Scan on memo  (cost=0.00..2003.74 rows=6125 width=390) (actual time=74.035..75.286 rows=5206 loops=2)
                    Filter: ((parent_id IS NULL) AND (visibility = 'public'::visibility))
                    Rows Removed by Filter: 12252
                    Buffers: shared hit=1747
              ->  Hash  (cost=6.21..6.21 rows=221 width=58) (actual time=0.047..0.048 rows=221 loops=2)
                    Buckets: 1024  Batches: 1  Memory Usage: 21kB
                    Buffers: shared hit=8
                    ->  Seq Scan on "user"  (cost=0.00..6.21 rows=221 width=58) (actual time=0.017..0.031 rows=221 loops=2)
                          Buffers: shared hit=8
  SubPlan 1
    ->  Aggregate  (cost=2183.45..2183.47 rows=1 width=4) (actual time=1.236..1.236 rows=1 loops=10411)
          Buffers: shared hit=18188017
          ->  Seq Scan on memo comments  (cost=0.00..2183.45 rows=2 width=0) (actual time=1.010..1.234 rows=1 loops=10411)
                Filter: (parent_id = memo.id)
                Rows Removed by Filter: 34915
                Buffers: shared hit=18188017
Planning:
  Buffers: shared hit=4
Planning Time: 0.168 ms
JIT:
  Functions: 32
  Options: Inlining true, Optimization true, Expressions true, Deforming true
  Timing: Generation 0.785 ms (Deform 0.478 ms), Inlining 35.478 ms, Optimization 62.100 ms, Emission 50.492 ms, Total 148.855 ms
Execution Time: 12963.414 ms
```

## Reading the "comments indexed" plans

- **Every comment count goes through `memo_parent_id_idx`.** Each run of the subquery is
  an index-only scan of the memo's comments: 0.002 to 0.003 ms instead of 1.2 ms, and
  about 3 buffer hits instead of 1,750. The buffers of a whole list fall from 3.5 million
  to 6,300 for a scope and from 18 million to 31,000 for Explore. The scan's
  `Heap Fetches` are most likely the visibility map the seed leaves unset (`ANALYZE`
  does not vacuum); a vacuumed table should read the index alone.
- **Execution time falls from about 2.5 s to about 10 ms in a scope, and from 13 s to
  35 ms on Explore.** At these costs the planner no longer compiles the query with JIT,
  which cost 110 to 160 ms per run before.
- **The planner also uses the plain index to find the root memos.** The personal scope
  and the space now read their rows through it (`Index Cond: (parent_id IS NULL)`), all
  14,000 root memos, then filter on the author or the space. For the personal scope this
  replaces a scan of the whole table (707 buffers against 1,747). For the space it is a
  planner choice, not a gain: it reads 707 buffers where `memo_space_id_created_at_idx`
  read 348, a cost the new plan hides behind a much cheaper subquery. Neither is the
  index a list should be read through; that is what the list indexes of tickets 04 to 06
  are for. A partial index on `parent_id IS NOT NULL`, about 40% smaller, would serve the
  comment count just as well; the plans show no difference worth the extra clause, so the
  plain one is kept. Explore still scans the table: 10,411 of the table's 14,000 root
  memos are public.
- **What is left is the list itself.** The query takes 9 to 35 ms. The rest of the 40 to
  390 ms median is not explained here, since only the list query is; it can only be the
  queries for the attachments and reactions of every row and the serialization of up to
  10 MB of response. That is what pagination bounds. The sorts of the whole scope remain,
  now in memory (Explore's no longer spills to disk), and are what the list indexes of
  tickets 04 to 06 have to beat.

## "Comments indexed" query plans

Run of 2026-10-11, data set and machine above, with `memo_parent_id_idx` (migration
`0017_memo_parent_id_idx`).

### Personal scope

```sql
select "memo"."id", "memo"."user_id", "memo"."parent_id", "memo"."content", "memo"."tags", "memo"."visibility", "memo"."space_id", "memo"."pinned_at", "memo"."featured_at", "memo"."created_at", "memo"."updated_at", (SELECT COUNT(*)::int FROM memo AS comments WHERE comments.parent_id = memo.id) as "comment_count", "user"."name", "user"."image" from "memo" left join "user" on "memo"."user_id" = "user"."id" where (("memo"."user_id" = $1 and "memo"."space_id" is null) and "memo"."parent_id" is null) order by "memo"."pinned_at" DESC NULLS LAST, "memo"."created_at" desc
```

```
Sort  (cost=15002.62..15006.68 rows=1624 width=435) (actual time=10.652..10.708 rows=2000 loops=1)
  Sort Key: memo.pinned_at DESC NULLS LAST, memo.created_at DESC
  Sort Method: quicksort  Memory: 825kB
  Buffers: shared hit=6319
  ->  Nested Loop Left Join  (cost=0.29..14916.02 rows=1624 width=435) (actual time=0.054..9.336 rows=2000 loops=1)
        Buffers: shared hit=6319
        ->  Index Scan using memo_parent_id_idx on memo  (cost=0.29..1276.15 rows=1624 width=389) (actual time=0.023..1.817 rows=2000 loops=1)
              Index Cond: (parent_id IS NULL)
              Filter: ((space_id IS NULL) AND (user_id = 'bench-writer'::text))
              Rows Removed by Filter: 12000
              Buffers: shared hit=707
        ->  Materialize  (cost=0.00..6.77 rows=1 width=58) (actual time=0.000..0.000 rows=1 loops=2000)
              Buffers: shared hit=2
              ->  Seq Scan on "user"  (cost=0.00..6.76 rows=1 width=58) (actual time=0.008..0.008 rows=1 loops=1)
                    Filter: (id = 'bench-writer'::text)
                    Rows Removed by Filter: 1
                    Buffers: shared hit=2
        SubPlan 1
          ->  Aggregate  (cost=8.37..8.38 rows=1 width=4) (actual time=0.003..0.003 rows=1 loops=2000)
                Buffers: shared hit=5610
                ->  Index Only Scan using memo_parent_id_idx on memo comments  (cost=0.29..8.36 rows=2 width=0) (actual time=0.003..0.003 rows=2 loops=2000)
                      Index Cond: (parent_id = memo.id)
                      Heap Fetches: 3015
                      Buffers: shared hit=5610
Planning Time: 0.147 ms
Execution Time: 10.782 ms
```

### Space

```sql
select "memo"."id", "memo"."user_id", "memo"."parent_id", "memo"."content", "memo"."tags", "memo"."visibility", "memo"."space_id", "memo"."pinned_at", "memo"."featured_at", "memo"."created_at", "memo"."updated_at", (SELECT COUNT(*)::int FROM memo AS comments WHERE comments.parent_id = memo.id) as "comment_count", "user"."name", "user"."image" from "memo" left join "user" on "memo"."user_id" = "user"."id" where ("memo"."space_id" = $1 and "memo"."parent_id" is null) order by "memo"."pinned_at" DESC NULLS LAST, "memo"."created_at" desc
```

```
Sort  (cost=18401.18..18406.25 rows=2028 width=435) (actual time=8.898..8.953 rows=2000 loops=1)
  Sort Key: memo.pinned_at DESC NULLS LAST, memo.created_at DESC
  Sort Method: quicksort  Memory: 851kB
  Buffers: shared hit=6345
  ->  Hash Left Join  (cost=9.26..18289.78 rows=2028 width=435) (actual time=0.241..7.585 rows=2000 loops=1)
        Hash Cond: (memo.user_id = "user".id)
        Buffers: shared hit=6345
        ->  Index Scan using memo_parent_id_idx on memo  (cost=0.29..1276.15 rows=2028 width=389) (actual time=0.196..1.507 rows=2000 loops=1)
              Index Cond: (parent_id IS NULL)
              Filter: (space_id = 'bench-space'::text)
              Rows Removed by Filter: 12000
              Buffers: shared hit=707
        ->  Hash  (cost=6.21..6.21 rows=221 width=58) (actual time=0.032..0.032 rows=221 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 21kB
              Buffers: shared hit=4
              ->  Seq Scan on "user"  (cost=0.00..6.21 rows=221 width=58) (actual time=0.003..0.016 rows=221 loops=1)
                    Buffers: shared hit=4
        SubPlan 1
          ->  Aggregate  (cost=8.37..8.38 rows=1 width=4) (actual time=0.003..0.003 rows=1 loops=2000)
                Buffers: shared hit=5634
                ->  Index Only Scan using memo_parent_id_idx on memo comments  (cost=0.29..8.36 rows=2 width=0) (actual time=0.002..0.003 rows=2 loops=2000)
                      Index Cond: (parent_id = memo.id)
                      Heap Fetches: 3036
                      Buffers: shared hit=5634
Planning:
  Buffers: shared hit=4
Planning Time: 0.166 ms
Execution Time: 9.016 ms
```

### Explore

```sql
select "memo"."id", "memo"."user_id", "memo"."parent_id", "memo"."content", "memo"."tags", "memo"."visibility", "memo"."space_id", "memo"."pinned_at", "memo"."featured_at", "memo"."created_at", "memo"."updated_at", (SELECT COUNT(*)::int FROM memo AS comments WHERE comments.parent_id = memo.id) as "comment_count", "user"."name", "user"."image" from "memo" left join "user" on "memo"."user_id" = "user"."id" where ("memo"."visibility" = $1 and "memo"."parent_id" is null) order by "memo"."featured_at" DESC NULLS LAST, "memo"."created_at" desc
```

```
Gather Merge  (cost=3413.58..91714.97 rows=10393 width=435) (actual time=7.774..34.394 rows=10411 loops=1)
  Workers Planned: 1
  Workers Launched: 1
  Buffers: shared hit=31038
  ->  Sort  (cost=2413.57..2428.86 rows=6114 width=431) (actual time=5.557..5.778 rows=5206 loops=2)
        Sort Key: memo.featured_at DESC NULLS LAST, memo.created_at DESC
        Sort Method: quicksort  Memory: 3230kB
        Buffers: shared hit=1842
        Worker 0:  Sort Method: quicksort  Memory: 1155kB
        ->  Hash Left Join  (cost=8.97..2029.07 rows=6114 width=431) (actual time=0.055..2.275 rows=5206 loops=2)
              Hash Cond: (memo.user_id = "user".id)
              Buffers: shared hit=1806
              ->  Parallel Seq Scan on memo  (cost=0.00..2003.74 rows=6114 width=389) (actual time=0.006..1.707 rows=5206 loops=2)
                    Filter: ((parent_id IS NULL) AND (visibility = 'public'::visibility))
                    Rows Removed by Filter: 12252
                    Buffers: shared hit=1747
              ->  Hash  (cost=6.21..6.21 rows=221 width=58) (actual time=0.032..0.033 rows=221 loops=2)
                    Buckets: 1024  Batches: 1  Memory Usage: 21kB
                    Buffers: shared hit=8
                    ->  Seq Scan on "user"  (cost=0.00..6.21 rows=221 width=58) (actual time=0.004..0.017 rows=221 loops=2)
                          Buffers: shared hit=8
  SubPlan 1
    ->  Aggregate  (cost=8.37..8.38 rows=1 width=4) (actual time=0.002..0.002 rows=1 loops=10411)
          Buffers: shared hit=29196
          ->  Index Only Scan using memo_parent_id_idx on memo comments  (cost=0.29..8.36 rows=2 width=0) (actual time=0.002..0.002 rows=1 loops=10411)
                Index Cond: (parent_id = memo.id)
                Heap Fetches: 15500
                Buffers: shared hit=29196
Planning:
  Buffers: shared hit=4
Planning Time: 0.148 ms
Execution Time: 34.643 ms
```

## Reading the "paginated" plans: Explore

- **Explore reads its page through `memo_explore_idx`.** An index scan in Explore's
  order, `featured_at DESC NULLS LAST, created_at DESC, id DESC`, partial on public root
  memos, stopped by the `LIMIT` after 21 rows (the page, and one more to know whether
  another follows). 117 buffer hits and 0.1 ms, against a scan and a sort of all 10,411
  public memos before. The comment count, the author and the hydration now run 21 times
  instead of 10,411.
- **A page deep in the list costs what the first does.** Page 100 seeks straight to its
  cursor, `Index Cond: ((featured_at IS NULL) AND (ROW(created_at, id) < ROW(...)))`:
  126 buffer hits and 0.1 ms. An offset would have read and dropped the 1,980 memos
  before it.
- **The index matches the query to the null order.** Drizzle writes a descending index
  column `NULLS LAST` unless told otherwise, and a plain `DESC` in the query puts nulls
  first: on `created_at` and `id` the index says `NULLS FIRST`, or the planner would not
  read the order from it, `NOT NULL` columns notwithstanding.
- **A cursor inside the featured block** resumes on a condition with an `OR` (the rest of
  the block, then every memo outside it), which the index serves in order but not as a
  seek: the scan should read from the top of Explore and filter out the featured memos
  already read. That is at most the featured memos, a handful an operator chose. Not
  measured: the 6 featured memos of this data set all fit in the first page.
- **What is left** of the 1.7 ms median, beside the 0.1 ms list query, is fetching the
  attachments and reactions of 20 memos and serializing a 19 KB response.

## "Paginated" query plans: Explore

Run of 2026-10-12, data set and machine above, with `memo_explore_idx` (migration
`0018_memo_explore_idx`).

### Explore, first page

```sql
select "memo"."id", "memo"."user_id", "memo"."parent_id", "memo"."content", "memo"."tags", "memo"."visibility", "memo"."space_id", "memo"."pinned_at", "memo"."featured_at", "memo"."created_at", "memo"."updated_at", (SELECT COUNT(*)::int FROM memo AS comments WHERE comments.parent_id = memo.id) as "comment_count", "user"."name", "user"."image", "memo"."featured_at"::text as "leading_key", "memo"."created_at"::text as "created_at_key" from "memo" left join "user" on "memo"."user_id" = "user"."id" where ("memo"."visibility" = $1 and "memo"."parent_id" is null) order by "memo"."featured_at" DESC NULLS LAST, "memo"."created_at" desc, "memo"."id" desc limit $2
```

```
Limit  (cost=0.44..185.05 rows=21 width=499) (actual time=0.009..0.093 rows=21 loops=1)
  Buffers: shared hit=117
  ->  Nested Loop Left Join  (cost=0.44..91679.97 rows=10429 width=499) (actual time=0.009..0.092 rows=21 loops=1)
        Buffers: shared hit=117
        ->  Index Scan using memo_explore_idx on memo  (cost=0.29..3885.28 rows=10429 width=389) (actual time=0.002..0.005 rows=21 loops=1)
              Buffers: shared hit=18
        ->  Memoize  (cost=0.15..0.17 rows=1 width=58) (actual time=0.001..0.001 rows=1 loops=21)
              Cache Key: memo.user_id
              Cache Mode: logical
              Hits: 0  Misses: 21  Evictions: 0  Overflows: 0  Memory Usage: 3kB
              Buffers: shared hit=42
              ->  Index Scan using user_pkey on "user"  (cost=0.14..0.16 rows=1 width=58) (actual time=0.001..0.001 rows=1 loops=21)
                    Index Cond: (id = memo.user_id)
                    Buffers: shared hit=42
        SubPlan 1
          ->  Aggregate  (cost=8.37..8.38 rows=1 width=4) (actual time=0.002..0.002 rows=1 loops=21)
                Buffers: shared hit=57
                ->  Index Only Scan using memo_parent_id_idx on memo comments  (cost=0.29..8.36 rows=2 width=0) (actual time=0.002..0.002 rows=2 loops=21)
                      Index Cond: (parent_id = memo.id)
                      Heap Fetches: 34
                      Buffers: shared hit=57
Planning:
  Buffers: shared hit=4
Planning Time: 0.080 ms
Execution Time: 0.101 ms
```

### Explore, page 100

```sql
select "memo"."id", "memo"."user_id", "memo"."parent_id", "memo"."content", "memo"."tags", "memo"."visibility", "memo"."space_id", "memo"."pinned_at", "memo"."featured_at", "memo"."created_at", "memo"."updated_at", (SELECT COUNT(*)::int FROM memo AS comments WHERE comments.parent_id = memo.id) as "comment_count", "user"."name", "user"."image", "memo"."featured_at"::text as "leading_key", "memo"."created_at"::text as "created_at_key" from "memo" left join "user" on "memo"."user_id" = "user"."id" where ("memo"."visibility" = $1 and "memo"."parent_id" is null and ("memo"."featured_at" is null and ("memo"."created_at", "memo"."id") < ($2::timestamp, $3))) order by "memo"."featured_at" DESC NULLS LAST, "memo"."created_at" desc, "memo"."id" desc limit $4
```

```
Limit  (cost=0.44..186.62 rows=21 width=499) (actual time=0.009..0.097 rows=21 loops=1)
  Buffers: shared hit=126
  ->  Nested Loop Left Join  (cost=0.44..74950.31 rows=8454 width=499) (actual time=0.009..0.096 rows=21 loops=1)
        Buffers: shared hit=126
        ->  Index Scan using memo_explore_idx on memo  (cost=0.29..3774.80 rows=8454 width=389) (actual time=0.002..0.006 rows=21 loops=1)
              Index Cond: ((featured_at IS NULL) AND (ROW(created_at, id) < ROW('2025-08-13 02:21:25.415'::timestamp without time zone, 'bench-memo-07409'::text)))
              Buffers: shared hit=23
        ->  Memoize  (cost=0.15..0.18 rows=1 width=58) (actual time=0.001..0.001 rows=1 loops=21)
              Cache Key: memo.user_id
              Cache Mode: logical
              Hits: 0  Misses: 21  Evictions: 0  Overflows: 0  Memory Usage: 3kB
              Buffers: shared hit=42
              ->  Index Scan using user_pkey on "user"  (cost=0.14..0.17 rows=1 width=58) (actual time=0.001..0.001 rows=1 loops=21)
                    Index Cond: (id = memo.user_id)
                    Buffers: shared hit=42
        SubPlan 1
          ->  Aggregate  (cost=8.37..8.38 rows=1 width=4) (actual time=0.003..0.003 rows=1 loops=21)
                Buffers: shared hit=61
                ->  Index Only Scan using memo_parent_id_idx on memo comments  (cost=0.29..8.36 rows=2 width=0) (actual time=0.002..0.002 rows=2 loops=21)
                      Index Cond: (parent_id = memo.id)
                      Heap Fetches: 35
                      Buffers: shared hit=61
Planning:
  Buffers: shared hit=4
Planning Time: 0.085 ms
Execution Time: 0.105 ms
```
