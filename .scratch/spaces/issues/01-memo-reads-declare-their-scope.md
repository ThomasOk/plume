# 01 — Every Memo read declares its scope

**What to build:** No user-visible change. This is the prefactor that makes every later
ticket easy: the Space columns land in the schema, and every read of Memos stops composing
its own ownership filter by hand.

Today authorization is written inline at roughly ten call sites in the memos service, plus
one in the attachments service that guards only `private` and lets everything else through.
That shape cannot absorb a second dimension: the first forgotten condition is a leak
between Spaces. After this ticket, a query that reads Memos without saying **whose** Memos
it reads does not compile.

Schema:

- A `space` table (identifier, title) and a `space_member` table (Space, User, Role, joined
  timestamp) — composite key, **no status column**, an index supporting "the Spaces of one
  User".
- `memo` gains a nullable Space reference, cascading on Space deletion, and an index for
  the dominant read: the Memos of one Space, newest first.
- `visibility` gains the value `space`.
- A `CHECK` constraint enforcing the equivalence **in both directions**: a Memo has a Space
  if and only if its visibility is `space`. The implication alone is not enough — it is the
  equivalence that makes `space + private` and `space + public` unrepresentable.
- Migration generated and committed per the repo's Drizzle workflow. `db:push` is not used.

The scope. This type shape is the decision, reproduced because prose states it less
precisely:

```ts
type MemoScope =
  | { kind: 'personal'; userId: string }
  | { kind: 'space'; spaceId: string };
```

- One function, in one place, turns a scope into its SQL condition. **No call site composes
  it by hand.** The personal condition is `author is this user AND the Memo has no Space`;
  the Space condition is `the Memo is in this Space`, with no author condition.
- Every Memo read takes the scope as a **required parameter**: list, search, the Tag tree,
  Activity, the Memo count, and the read guard in the attachments service.
- Only the personal scope is reachable — nothing constructs a Space scope yet.
- Explore is deliberately **outside** all scopes and is not touched.

Note the behaviour change hiding here: the personal list filters on the author alone today,
so without the `AND the Memo has no Space` half it would start returning the User's Space
Memos the moment ticket 03 ships.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] The migration applies cleanly and is committed
- [x] The `CHECK` constraint rejects a Memo with a Space whose visibility is not `space`
- [x] The `CHECK` constraint rejects a Memo whose visibility is `space` with no Space
- [x] Every Memo read takes a scope; omitting it is a type error
- [x] The scope-to-SQL translation exists in exactly one place
- [x] A Memo inserted directly with a Space does **not** appear in the author's personal list
- [x] A Memo inserted directly with a Space does **not** contribute to the author's personal Tag tree, Activity or Memo count
- [x] The attachments read guard goes through the scope instead of testing `private`
- [x] The existing integration and unit suites pass unchanged
- [x] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
