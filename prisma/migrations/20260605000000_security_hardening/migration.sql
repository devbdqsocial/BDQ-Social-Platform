-- Security hardening (audit P0-1, P0-2, P1-4). Idempotent so it is safe to apply to a prod DB
-- with no migrate history (diff + db execute workflow).

-- P1-4: bind a stall hold to the user who placed it, so release can enforce ownership.
ALTER TABLE "Stall" ADD COLUMN IF NOT EXISTS "holdUserId" TEXT;

-- P0-1: per-(coupon,user,order) redemption ledger. The unique index makes per-user coupon-limit
-- enforcement race-safe.
CREATE TABLE IF NOT EXISTS "CouponRedemption" (
  "id"        TEXT NOT NULL,
  "couponId"  TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "orderId"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CouponRedemption_userId_fkey"   FOREIGN KEY ("userId")   REFERENCES "User"("id")   ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CouponRedemption_orderId_fkey"  FOREIGN KEY ("orderId")  REFERENCES "Order"("id")  ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CouponRedemption_couponId_userId_orderId_key"
  ON "CouponRedemption" ("couponId", "userId", "orderId");
CREATE INDEX IF NOT EXISTS "CouponRedemption_couponId_userId_idx"
  ON "CouponRedemption" ("couponId", "userId");

-- P0-2: re-assert the load-bearing "one active booking per stall" partial unique index. It is not
-- expressible in schema.prisma, so a schema-diff bootstrap can silently omit it; assert it here.
CREATE UNIQUE INDEX IF NOT EXISTS "one_active_booking_per_stall"
  ON "Booking" ("stallId")
  WHERE "status" IN ('HELD', 'PENDING', 'BOOKED');
