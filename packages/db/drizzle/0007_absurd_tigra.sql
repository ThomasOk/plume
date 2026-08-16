-- Before enforcing uniqueness on entity_id, remove any pre-existing duplicate
-- notifications so the constraint applies cleanly. Keep the oldest row per entity_id
-- (tie-break on id), matching the "first notification wins" behaviour the outbox
-- consumer now guarantees going forward.
DELETE FROM "notification" a
USING "notification" b
WHERE a.entity_id = b.entity_id
  AND (a.created_at > b.created_at
       OR (a.created_at = b.created_at AND a.id > b.id));
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_entity_id_unique" UNIQUE("entity_id");