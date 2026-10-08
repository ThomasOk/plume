# 01: A user can be an operator

**What to build:** The person running Plume can make an account an **operator** with one
command, and take the role back with another; the role then reaches the app through the
account's session, on the server and in the web client. Nobody can obtain it any other
way — above all, not by claiming it at sign-up. The role grants no power yet: featuring
memos arrives in ticket 02. See the spec, `.scratch/featured-memos/spec.md`, sections
*Being an operator*, *Schema* and *Who is an operator*.

- The user gains an operator flag, false by default, declared to Better Auth as an
  additional user field the client cannot write. Follow the auth schema workflow in
  `CLAUDE.md` (regenerate the auth schema, fix its style, generate and apply the migration).
- A grant command and a revoke command, run against the target database, take a **user
  identifier** (never an email: sign-up does not verify addresses), print the name and
  email of the account they change, are idempotent, and fail on an unknown identifier.
  Each is a thin shell over a grant function and a revoke function.
- The web client's session type knows the flag.
- Being an operator grants nothing inside a space.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A sign-up whose body claims `isOperator: true` creates a user who is not an operator (the test of the client-unwritable field)
- [ ] After the grant function, the user's session says they are an operator; after the revoke function, it says they are not
- [ ] Granting twice changes nothing; granting or revoking an unknown identifier fails with a clear message
- [ ] The commands print the account's name and email, and are documented as the way to grant the role in production
- [ ] These run on the new seam: the Better Auth instance built on the Testcontainers database, driven through its server API
- [ ] The web client's session exposes `isOperator`, typed
- [ ] The migration is additive (ADR 0005)
- [ ] ADR 0007, *The operator is a flag on the user, granted out of band*, records the decision and the rejected options (an environment allowlist, Better Auth's admin plugin, a separate table) — see the spec's *Documentation*
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass
