# The operator is a flag on the user, granted out of band

An operator runs the Plume instance and acts on what belongs to no scope, such as featuring
memos on Explore or deleting another user's public memo, or a comment on one. The role is a boolean on Better Auth's user table, `user.is_operator`,
not null and false by default, declared as an additional user field with `input: false`. A
boolean rather than a role enum: there is one instance-level capability, and "role" already
names the space roles. It becomes an enum the day there are several instance levels.

`input: false` is the security-critical line. The user table belongs to Better Auth, and
an additional field the client may write is accepted at sign-up: without it, anyone could
register as an operator by adding `isOperator: true` to the request. Better Auth replaces
the claimed value with the default on create, and refuses an attempt to set it on update.

The role is granted and revoked outside the app, by two commands run against the target
database, and by nothing else; no screen grants it.

```bash
# Locally, against the database in apps/server/.env
pnpm --filter server operator:grant <user-id>
pnpm --filter server operator:revoke <user-id>

# In production, from a shell on the server service (`railway ssh`), whose environment
# already holds SERVER_POSTGRES_URL. The build ships both commands next to migrate.js.
node /app/dist/grant-operator.js <user-id>
node /app/dist/revoke-operator.js <user-id>
```

They take a **user identifier**, never an email: sign-up does not verify email addresses,
so whoever registers first with the operator's address would otherwise be the one
promoted. Each prints the name and email of the account it changed, so a wrong identifier
shows itself; each is idempotent, and fails on an unknown identifier. They are thin shells
over `grantOperator` and `revokeOperator` in `@repo/auth/operator`, which the tests drive.

The role reaches the app through the session: the server reads `session.user.isOperator`,
and the web client infers the same field into its session type, so the interface knows
without an extra request. Being an operator grants nothing inside a space — no membership
check consults the flag (ADR 0004's isolation is untouched) — and nothing over a memo that is
not public: what an operator may act on is exactly what Explore exposes. Their powers are
decided in an operator policy of their own, beside the space policy and never inside it; an
action open to both, such as deleting a memo, asks each policy and allows it if either
does.

## Considered options

- **An allowlist of user identifiers in the server's environment** — no schema change, and
  a revocation applies at the next deployment for every session at once. Rejected: the
  person running Plume preferred the role to live with the account, and a role read from
  the environment never reaches the client's session type without an endpoint of its own.
- **Better Auth's admin plugin** — rejected: it adds ban and impersonation columns nobody
  needs, and its role is literally named `admin`, which collides with the space role of
  that name.
- **A separate `operator` table** — rejected: a join on every session read, or a second
  query, to carry one boolean; and Better Auth would not expose it in the session.

## Consequences

- **A change takes up to five minutes to apply.** Sessions are cached in a cookie for five
  minutes, so a grant or a revocation reaches a signed-in user when that cache expires.
  Accepted for an instance with a single operator; an urgent revocation means revoking the
  account's sessions.
- **Revoking an operator undoes nothing they did.** What they curated (featured memos)
  belongs to Explore, not to whoever decided it.
