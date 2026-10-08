-- The Former user: the author a deleted account's memos and comments pass to when they
-- outlive it. Its id is FORMER_USER_ID in @repo/db. No `account` row, so it can never sign
-- in; `.invalid` is a reserved domain (RFC 2606), so no one can sign up with its email.
INSERT INTO "user" ("id", "name", "email", "email_verified", "created_at", "updated_at")
VALUES ('former-user', 'Deleted user', 'former-user@plume.invalid', false, now(), now());
