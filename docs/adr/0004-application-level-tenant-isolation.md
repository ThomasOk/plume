# Tenant isolation lives in the application, not in Postgres RLS

Every read of memos takes a `MemoScope` — `{ kind: 'personal', userId }` or
`{ kind: 'space', spaceId }` — and a single function turns it into a SQL condition. The
scope is a **required parameter**, so a query that reads memos without declaring whose
memos it reads does not compile. We chose this over Postgres Row-Level Security, which
would have enforced the same rule inside the database.

Authorization is split in two, and the split is the point. `MemoScope` answers *which rows
may be read*. The role matrix — an admin may delete another member's memo but never edit
it, only an admin manages membership, the last admin cannot leave — answers *which actions
are allowed*, and lives in `space-policy.ts` as pure functions over values, with no
database access. A `spaceProcedure` middleware resolves the facts once (is this user a
member, with which role) and puts them in the tRPC context; services load the row, then
ask the policy. A policy function that needs `db` is the signal that a fact was not
resolved upstream.

## Considered options

- **Postgres RLS** — rejected for three reasons, in order of weight. (1) `packages/db`
  connects through a `node-postgres` **Pool**, so connections are reused across users: a
  session variable set for one request and not cleared leaks the previous user's identity
  to the next — the exact cross-tenant leak RLS was meant to prevent. `SET LOCAL` fixes it
  only by wrapping *every* query, including plain reads, in an explicit transaction. (2)
  The rules would exist twice, in SQL policies and in TypeScript, with nothing checking
  that the two agree. (3) RLS protects against queries the application did not write, and
  nothing but the application reads this database. Trigger to adopt it: a second consumer
  of the database (analytics, another service, direct human access), or a compliance
  requirement. It layers on top of `MemoScope` without replacing it.
- **Inline checks, as they are today** — rejected: authorization is currently written by
  hand at ~10 call sites in `memos-service.ts`, plus one in `attachments-service.ts` that
  guards only `private` and would let a space memo's attachments fall through to open
  access. That is the failure mode being designed out, not a pattern to extend.
- **Enforcement in the tRPC middleware alone** — rejected: the middleware runs before the
  service has loaded the row. "May I delete this memo?" depends on who wrote it, which the
  middleware does not know. It can enforce membership; it cannot enforce the matrix.

## Consequences

The guarantee is a compile-time one: it catches the query written wrongly, not the query
that bypasses the application. That matches the risk this project actually has. It also
means the protection is only as good as the types — a raw SQL escape hatch sidesteps it,
so raw SQL over `memo` is the thing to watch in review.
