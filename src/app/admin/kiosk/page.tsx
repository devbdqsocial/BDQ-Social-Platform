import type { Metadata } from "next";
import { requireCheckin } from "@/server/auth/guard";
import { KioskLauncher } from "@/components/checkin/KioskLauncher";
import { KioskClient } from "@/components/checkin/KioskClient";

export const metadata: Metadata = { title: "Kiosk" };
export const dynamic = "force-dynamic";

/** Fullscreen, unattended gate kiosk (admin-portal §7). Lives outside the console group so it has
 *  no sidebar chrome. Same CHECKIN guard as the scanner. */
export default async function KioskPage({ searchParams }: { searchParams: Promise<{ gate?: string }> }) {
  await requireCheckin();
  const { gate } = await searchParams;

  if (!gate) {
    return (
      <div className="admin min-h-[100svh] bg-background px-4">
        <KioskLauncher />
      </div>
    );
  }
  return <KioskClient gate={gate} />;
}
