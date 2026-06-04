import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/server/auth/guard";
import { PageHeader } from "@/components/ui/page-header";
import { NewMapForm } from "./NewMapForm";

export const metadata: Metadata = { title: "Create map" };

export default async function NewMapPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <PageHeader title="Create a map" description="Enter the real venue size — a true-scale boundary box is drawn for you to design inside." />
        <Link href="/admin/venue/maps" className="shrink-0 text-sm text-muted-foreground hover:text-foreground">← All maps</Link>
      </div>

      <NewMapForm />
    </div>
  );
}
