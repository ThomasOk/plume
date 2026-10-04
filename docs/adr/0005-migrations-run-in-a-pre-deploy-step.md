# Production migrations run in a pre-deploy step

Every deployment of the server applies pending migrations before the new version takes
traffic: Railway's pre-deploy command runs `node /app/dist/migrate.js`, built from
`apps/server/src/migrate.ts`. A failing migration aborts the deployment and the previous
version keeps serving.

Until now production was migrated by hand, and the step was forgotten once: the Spaces
tickets deployed code that reads `memo.space_id` onto a database that had no such column,
and memos stopped loading until `0008` and `0009` were applied manually. A deploy that can
ship code ahead of its schema will eventually do so.

The script uses drizzle-orm's runtime migrator rather than `drizzle-kit`, which is a dev
dependency absent from the production image. Both record applied migrations in the same
`drizzle.__drizzle_migrations` table, so local `pnpm db:migrate` and production stay
interchangeable. The build copies `packages/db/drizzle` into `dist/drizzle`, next to the
script, because the production image keeps only `dist`.

## Consequence: migrations must be backward compatible

The pre-deploy step runs while the previous version is still serving, so for a moment the
old code runs against the new schema. Additive changes (a table, a nullable column, an enum
value, an index) are safe. A destructive change — dropping or renaming a column the running
code reads — must be split across two deployments: stop using it, deploy, then remove it.

## Considered options

- **Migrate at server boot** — rejected: it runs on every restart and every replica rather
  than once per deployment, and a failing migration crash-loops the server instead of
  leaving the previous version up.
- **Migrate from CI before deploying** — rejected: CI would need production database
  credentials. (Railway now waits for CI before deploying, so the race this option also
  risked is gone; the credentials alone still rule it out.)
- **Keep migrating by hand** — rejected: it is what failed.
