-- Prevent duplicate accounts that differ only by email case.
-- Idempotent: safe to run more than once (local uses db push; prod uses migrate deploy).

-- 1. Normalize any existing case-variant emails to lowercase (no-op if already lowercased).
UPDATE "User" SET email = lower(email) WHERE email IS NOT NULL AND email <> lower(email);

-- 2. Durable DB-level guard: reject a case-variant of an existing email on any write path.
--    (NULL emails are allowed to repeat, matching the existing nullable-unique behaviour.)
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_lower_key" ON "User" (lower(email));
