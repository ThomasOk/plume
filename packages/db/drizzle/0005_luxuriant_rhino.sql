ALTER TYPE "public"."notification_type" ADD VALUE 'MEMO_MENTION';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
WITH ranked AS (
  SELECT
    id,
    lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g')) AS base_slug,
    row_number() OVER (
      PARTITION BY lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g'))
      ORDER BY "created_at"
    ) AS rn
  FROM "user"
)
UPDATE "user" u
SET username = CASE
  WHEN r.rn = 1 THEN r.base_slug
  ELSE r.base_slug || '_' || r.rn
END
FROM ranked r
WHERE u.id = r.id;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");
