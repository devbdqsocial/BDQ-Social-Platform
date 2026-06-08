import { db } from "@/server/db";
import { ComingSoonClient } from "./ComingSoonClient";

export const dynamic = "force-dynamic";

export default async function ComingSoonPage() {
  const count = await db.waitlist.count({ where: { source: "PLATFORM" } });
  return <ComingSoonClient count={count} />;
}
