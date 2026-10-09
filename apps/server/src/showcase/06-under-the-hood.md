# 🛠️ Under the hood

For the curious developer — the full story is in the [repository](https://github.com/ThomasOk/plume).

**Stack** — a TypeScript monorepo (pnpm, Turborepo): React 19 with TanStack Router and Tailwind CSS on the front, Hono and tRPC on the back, PostgreSQL through Drizzle ORM, Better Auth for sign-in, Cloudflare R2 for attachments.

**Types end to end** — the tRPC router is shared between client and server: changing a procedure breaks the client at compile time, not in production.

**Notifications through a transactional outbox** — a comment and the event that announces it commit in the same transaction; a worker delivers it, with retries and backoff. No email is lost because a provider was down, and none is sent for a comment that was rolled back.

**Isolation in the application** — every query that reads a space's memos goes through a single scope condition, tested against a real database.

**Tests on a real Postgres** — integration tests start their own PostgreSQL through Testcontainers, so a constraint or a cast cannot pass in tests and fail in production.

**Decisions written down** — each structural choice has an [architecture decision record](https://github.com/ThomasOk/plume/tree/main/docs/adr), with the options that were rejected and why.

**Deployed** — the server and its database on Railway, migrations applied in a pre-deploy step; the web app on Vercel.

#plume/engineering
