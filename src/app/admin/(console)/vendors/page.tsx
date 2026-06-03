import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/guard";
import { listVendors } from "@/server/vendors/admin-service";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { VendorsTable } from "./VendorsTable";

export const metadata: Metadata = { title: "Vendors" };

export default async function AdminVendorsPage() {
  await requirePermission("VENDOR_VIEW");
  const vendors = await listVendors();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Vendors" description="Review brands, give them a verification call, then approve and assign a stall." />
        <Button asChild size="sm"><Link href="/admin/vendors/new">Add vendor</Link></Button>
      </div>
      <VendorsTable vendors={vendors} />
    </div>
  );
}
