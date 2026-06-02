-- Admin/staff password credential (scrypt hash). TOTP columns already exist. See Docs/BUSINESS-RULES.md §6.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
