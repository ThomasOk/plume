# Plume

A full-stack note-taking application built as a portfolio project to demonstrate production-grade TypeScript development practices. The app lets users write, organize, and share short notes (memos) with Markdown support, hashtag-based organization, and file attachments.

**Live demo:** [useplume.me](https://useplume.me)

---

## Tech stack

| Layer      | Technology                                           |
| ---------- | ---------------------------------------------------- |
| Frontend   | React 19, TanStack Router, Tailwind CSS v4           |
| Backend    | Hono, tRPC                                           |
| Database   | PostgreSQL, Drizzle ORM                              |
| Auth       | Better Auth (email/password + Google OAuth)          |
| Storage    | Cloudflare R2 (file attachments)                     |
| Monorepo   | Turborepo, pnpm workspaces                           |
| Testing    | Vitest (unit + integration), real PostgreSQL test DB |
| CI/CD      | GitHub Actions                                       |

Everything is TypeScript, end-to-end — from database schema to tRPC router types to React components.

---

## Features

- **Memos** — write short notes in Markdown with live preview
- **Hashtag system** — auto-extracted from content, supports hierarchical tags (`#cooking/italian`)
- **Search & filter** — full-text search, filter by tag or date
- **Public / private** — memos can be public (visible on the explore page) or private
- **File attachments** — upload images and files, stored on Cloudflare R2
- **Explore page** — browse public memos from all users, unauthenticated access
- **Activity calendar** — calendar showing daily memo activity
- **Authentication** — email/password and Google OAuth via Better Auth

---

## Architecture

The repo is a **pnpm monorepo** managed by Turborepo, split into three workspace types:

```
apps/
  web/       React SPA (TanStack Router, Vite)
  server/    Hono HTTP server (tRPC + Better Auth endpoints)

packages/
  @repo/api  tRPC router definitions — shared between client and server
  @repo/auth Better Auth configuration — shared between client and server
  @repo/db   Drizzle schema + database client
  @repo/ui   Shared Radix UI components (shadcn-based)
```

**Key architectural decisions:**

- **tRPC** for type-safe API calls — no API contract drift, no code generation step
- **Feature-based structure** on both frontend and backend
- **Drizzle ORM** with versioned SQL migrations committed to the repo
- **Better Auth** abstracts session management cleanly; the tRPC context exposes `ctx.session` to all protected procedures

---

## Running locally

### Prerequisites

- Node.js >= 22.10.0
- pnpm >= 9
- Docker (for PostgreSQL)

### Setup

```bash
# Clone and install dependencies
git clone https://github.com/ThomasOk/plume.git
cd plume
pnpm install

# Copy environment files
pnpm env:copy-example

# Start PostgreSQL
docker compose up db -d

# Apply database migrations
pnpm db:migrate

# Start the dev server (web + API in watch mode)
pnpm dev
```

Web app: `http://localhost:8085`
API server: `http://localhost:3035`

### Running with Docker Compose (production-like)

```bash
# Build and start all services (web, server, db)
docker compose up

# Run database migrations
docker compose --profile drizzle run drizzle
```

Web app: `http://localhost:8085`

---

## Tests

```bash
pnpm test          # Run all tests
pnpm typecheck     # TypeScript checks across the monorepo
pnpm lint          # ESLint
```

The test suite covers:

- **Unit tests** — `extractTagsFromContent`, `buildFilterConditions`, `buildTagTree` utilities
- **Integration tests** — tRPC procedures tested against a real PostgreSQL database

The CI pipeline runs on every push and pull request to `main`: lint, typecheck, unit tests, and integration tests with a live PostgreSQL service.

---

## Project structure (selected)

```
packages/api/src/server/features/memos/
  procedures.ts   tRPC procedures (list, create, update, delete, getById, listPublic, stats)
  schemas.ts      Zod input schemas
  utils.ts        Business logic (tag extraction, filter conditions, tag tree builder)
  utils.test.ts   Unit + integration tests

packages/db/src/schemas/
  memos.ts        Drizzle schema for memos table (id, content, tags[], visibility, timestamps)
  attachments.ts  File attachment schema with R2 key reference
  auth.ts         Better Auth generated schema

apps/web/src/routes/
  (memos)/        Authenticated memo routes (list, create, edit)
  explore.tsx     Public explore page
  settings.tsx    User settings
```
