-- Repair: 'RESERVED' reached the local DB via db push only — no migration ever added it, so
-- 20260624000000_active_booking_states (partial unique index referencing 'RESERVED') fails on any
-- database built from the migration chain. Must run in its own migration: Postgres can't use a new
-- enum value in the same transaction that adds it. Idempotent.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'RESERVED' BEFORE 'HELD';
