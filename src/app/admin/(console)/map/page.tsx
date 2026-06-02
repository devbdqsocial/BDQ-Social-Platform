import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { MapDesignerLoader } from "@/components/map/MapDesignerLoader";

export const metadata: Metadata = { title: "Floor plan" };

export default async function AdminMapPage() {
  await requireSuperAdmin();
  return (
    <div>
      <header className="mb-4">
        <h1 className="font-display text-2xl font-semibold">Floor plan</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
          Lay out the venue to scale — drag to add and arrange stalls, stages, and zones, then set
          each stall&apos;s price on the right. Your work saves as you go.
        </p>
      </header>
      <MapDesignerLoader />
    </div>
  );
}
