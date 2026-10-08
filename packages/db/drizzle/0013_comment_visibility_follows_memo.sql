-- A comment shares its memo's visibility (ADR 0001), but an edit of the memo's visibility
-- used to leave its comments' copies behind. Realign them; edits now carry them along.
UPDATE "memo" AS "comment"
SET "visibility" = "parent"."visibility"
FROM "memo" AS "parent"
WHERE "comment"."parent_id" = "parent"."id"
  AND "comment"."visibility" IS DISTINCT FROM "parent"."visibility";
