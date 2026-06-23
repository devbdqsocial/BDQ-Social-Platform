// Additive migration apply for 20260624000000_event_days. Idempotent; tolerates already-exists.
// Run: node --env-file=.env scripts/apply-event-days.mjs <local|prod>
import { PrismaClient } from "@prisma/client";

const which = process.argv[2] === "prod" ? "prod" : "local";
const url = which === "prod" ? process.env.PROD_DATABASE_URL_DIRECT : process.env.DATABASE_URL_DIRECT;
if (!url) { console.error(`Missing ${which === "prod" ? "PROD_DATABASE_URL_DIRECT" : "DATABASE_URL_DIRECT"}`); process.exit(1); }

const db = new PrismaClient({ datasourceUrl: url });

const stmts = [
  `CREATE TABLE IF NOT EXISTS "EventDay" (
     "id" TEXT NOT NULL,
     "eventId" TEXT NOT NULL,
     "startsAt" TIMESTAMP(3) NOT NULL,
     "endsAt" TIMESTAMP(3) NOT NULL,
     "label" TEXT,
     "sortOrder" INTEGER NOT NULL DEFAULT 0,
     CONSTRAINT "EventDay_pkey" PRIMARY KEY ("id")
   )`,
  `ALTER TABLE "ScheduleItem" ADD COLUMN IF NOT EXISTS "eventDayId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "EventDay_eventId_idx" ON "EventDay"("eventId")`,
  `CREATE INDEX IF NOT EXISTS "ScheduleItem_eventDayId_idx" ON "ScheduleItem"("eventDayId")`,
  `ALTER TABLE "EventDay" ADD CONSTRAINT "EventDay_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_eventDayId_fkey" FOREIGN KEY ("eventDayId") REFERENCES "EventDay"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
];

async function main() {
  for (const sql of stmts) {
    try {
      await db.$executeRawUnsafe(sql);
      console.log("ok:", sql.slice(0, 60).replace(/\s+/g, " "));
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (/already exists|duplicate/i.test(msg)) console.log("skip (exists):", sql.slice(0, 60).replace(/\s+/g, " "));
      else throw e;
    }
  }
  const cols = await db.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name='ScheduleItem' AND column_name='eventDayId'`);
  console.log(`[${which}] EventDay table + ScheduleItem.eventDayId present:`, cols.length === 1);
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
