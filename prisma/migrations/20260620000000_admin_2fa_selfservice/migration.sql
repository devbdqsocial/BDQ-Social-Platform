-- Self-service admin 2FA + recovery + profile fields (additive, no drops).
-- totpPendingSecret: holds a secret mid-enrolment until a code confirms it.
-- recoveryCodes: SHA-256 hashes of one-time backup codes (one consumed per recovery login).
-- photoUrl/designation/whatsapp/prefs: My Profile self-service fields.

ALTER TABLE "User" ADD COLUMN "totpPendingSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "recoveryCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "designation" TEXT;
ALTER TABLE "User" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "User" ADD COLUMN "prefs" JSONB;
