-- Additive: reusable maps + global element catalog + Event.mapId link.
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "mapId" TEXT;

CREATE TABLE IF NOT EXISTS "MapElement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'STALL',
    "widthFt" DOUBLE PRECISION NOT NULL,
    "heightFt" DOUBLE PRECISION NOT NULL,
    "color" TEXT NOT NULL,
    "sellable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MapElement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EventMap" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "locationName" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'FT',
    "widthFt" DOUBLE PRECISION NOT NULL,
    "heightFt" DOUBLE PRECISION NOT NULL,
    "gridFt" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "layoutJson" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventMap_pkey" PRIMARY KEY ("id")
);
