-- Additive: reusable layout templates. Applied out-of-band (migrate history is not populated on this DB).
CREATE TABLE IF NOT EXISTS "LayoutTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layoutJson" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LayoutTemplate_pkey" PRIMARY KEY ("id")
);
