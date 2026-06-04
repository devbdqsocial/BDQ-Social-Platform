import { requireSuperAdmin } from "@/server/auth/guard";
import { db } from "@/server/db";
import { WaitlistTable } from "./WaitlistTable";

export const dynamic = "force-dynamic";

async function getPlatformWaitlist() {
  return db.platformWaitlist.findMany({ orderBy: { createdAt: "desc" } });
}

export default async function PlatformWaitlistPage() {
  await requireSuperAdmin();
  const entries = await getPlatformWaitlist();
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Waitlist</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {entries.length} sign-up{entries.length !== 1 ? "s" : ""} from the coming-soon page
          {" · "}{entries.filter(e => e.interestedInStall).length} interested in a stall
        </p>
      </div>
      <WaitlistTable entries={entries} />
    </div>
  );
}
