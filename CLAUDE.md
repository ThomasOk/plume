# CLAUDE.md

Plume — monorepo TypeScript full-stack : React + Hono + tRPC + Drizzle, pnpm + Turborepo.

## Working agreement

- Explain the trade-off behind a non-obvious choice, not just the choice.
- Challenge the premise before implementing: a weak assumption is worth a sentence of
  pushback, not a well-built wrong answer.
- Propose a plan and wait for go-ahead before any non-trivial change.

## Before touching the codebase

Read `CONTEXT.md` (the domain glossary — canonical vocabulary, one word per concept) and
any `docs/adr/` entry covering the area you're about to change. Name domain concepts with
the glossary's terms. If a change contradicts an ADR, surface the contradiction instead of
silently overriding it.

## Rules the code won't tell you

- **Routing** — route definitions live only in `apps/web/src/routes/`. Features expose
  components, hooks and schemas; routes are thin composition layers that consume them.
- **Schema changes** — edit `packages/db/src/schemas/` → `pnpm db:generate` → commit the
  generated migration → `pnpm db:migrate`. `db:push` is for local experimentation only.
  For the auth schema, run `pnpm auth:schema:generate` first, fix styles, then generate
  and migrate.
- **Integration tests** start their own Postgres through Testcontainers, so the Docker
  daemon must be running. There is no test database to set up by hand.

## Definition of done

`pnpm lint`, `pnpm typecheck` and `pnpm test` all pass. `pnpm test` runs Vitest only —
Playwright e2e is `pnpm --filter web test:e2e` and runs on demand.
One branch and one PR per ticket, conventional-commit subjects (`feat:`, `fix:`, `docs:`,
`chore:`).

## Where to look

| Situation                                      | Read                           |
| ---------------------------------------------- | ------------------------------ |
| Creating, updating or closing an issue or spec | `docs/agents/issue-tracker.md` |
| Setting the triage status of an issue          | `docs/agents/triage-labels.md` |
| A skill asks how domain docs are laid out      | `docs/agents/domain.md`        |
