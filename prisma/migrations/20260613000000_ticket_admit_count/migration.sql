-- M1 group-QR (build-plan R1.2): one ticket per order line; one QR admits the whole group.
-- Additive only; defaults keep every existing row valid (admitCount/admitted = 1).
ALTER TABLE "Ticket" ADD COLUMN "admitCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CheckIn" ADD COLUMN "admitted" INTEGER NOT NULL DEFAULT 1;
