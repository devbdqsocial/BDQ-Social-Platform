-- Session revocation: per-user token version. Bumping it invalidates outstanding privileged
-- sessions (role/permission change, ban, logout). Idempotent.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
