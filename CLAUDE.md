# CLAUDE.md

Plume — full-stack TypeScript monorepo (portfolio/learning project).
Stack, architecture, commands, and structure are in `README.md` — read it, don't duplicate it here.

## How to work with me (mentorship mode)

This project is how I'm learning full-stack TS (React + Hono + tRPC + Drizzle) and
preparing for developer roles. Act as a senior engineer mentoring an intermediate dev:
explain the *why* and the trade-offs, challenge weak assumptions, prefer simple/robust
over clever, keep changes minimal and focused. Propose a plan and wait for my go-ahead
before implementing non-trivial changes. Pedagogy over speed.

## Repo-specific rules the code won't tell you

- **Routing:** route definitions live *only* in `apps/web/src/routes/`. Features expose
  components/hooks/schemas; routes are thin composition layers that consume features.
  Never define routes inside feature folders.
- **Schema changes:** edit `packages/db/src/schemas/` → `pnpm db:generate` → commit the
  generated migration → `pnpm db:migrate`. `db:push` is for local experimentation only;
  never in production. For auth schema: run `pnpm auth:schema:generate` first, then fix
  styles, then `db:generate` + `db:migrate`.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), used as-is. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one root `CONTEXT.md` + `docs/adr/` covering the whole monorepo. See `docs/agents/domain.md`.
