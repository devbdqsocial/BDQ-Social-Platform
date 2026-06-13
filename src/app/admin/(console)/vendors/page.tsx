import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/guard";
import { listVendors } from "@/server/vendors/admin-service";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { VendorsTable } from "@/components/admin/tables/VendorsTable";

export const metadata: Metadata = { title: "Vendors" };

export default async function AdminVendorsPage() {
  await requirePermission("VENDOR_VIEW");
  const vendors = await listVendors();

  return (
    <div className="space-y-4">
      <PageHeader title="Vendors" description="Review brands, give them a verification call, then approve and assign a stall." />
      <VendorsTable vendors={vendors} />
    </div>
  );
}
