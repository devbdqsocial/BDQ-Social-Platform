-- Add ADMIN to the Role enum and TICKETS_MANAGE to Permission enum. Additive.
-- Postgres requires a transaction boundary check; ADD VALUE is auto-committed outside tx.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'TICKETS_MANAGE';
