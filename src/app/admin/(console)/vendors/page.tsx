import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/guard";
import { listVendors } from "@/server/vendors/admin-service";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Vendors" };

const STATUS: Record<string, { label: string; variant: "primary" | "warning" | "success" | "danger" }> = {
  SUBMITTED: { label: "New", variant: "primary" },
  UNDER_REVIEW: { label: "Reviewing", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Declined", variant: "danger" },
};

export default async function AdminVendorsPage() {
  await requirePermission("VENDOR_VIEW");
  const vendors = await listVendors();

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="Vendors" description="Review brands, give them a verification call, then approve and assign a stall." />
      {vendors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No brand applications yet.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {vendors.map((v) => {
            const s = STATUS[v.approvalStatus];
            return (
              <li key={v.id} className="flex items-center justify-between gap-3 p-4">
                <Link href={`/admin/vendors/${v.id}`} className="group min-w-0">
                  <p className="truncate font-medium group-hover:text-primary">{v.brandName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {v.category ?? "—"} · {v.user.phone ?? v.user.email ?? "no contact"} · {v._count.bookings} stall{v._count.bookings === 1 ? "" : "s"}
                  </p>
                </Link>
                {s && <Badge variant={s.variant}>{s.label}</Badge>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
