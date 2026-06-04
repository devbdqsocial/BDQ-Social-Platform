import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/guard";
import { PageHeader } from "@/components/ui/page-header";
import { NewVendorForm } from "./NewVendorForm";

export const metadata: Metadata = { title: "Add vendor" };

export default async function NewVendorPage() {
  await requirePermission("VENDOR_MANAGE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <PageHeader title="Add a vendor" description="Create the account by phone, add their brand details, then assign a stall." />
        <Link href="/admin/vendors" className="shrink-0 text-sm text-muted-foreground hover:text-foreground">← All vendors</Link>
      </div>

      <NewVendorForm />
    </div>
  );
}
