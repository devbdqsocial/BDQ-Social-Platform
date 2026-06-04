import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin, type Permission } from "@/server/auth/guard";
import { listStaff } from "@/server/staff/service";
import { STAFF_PRESETS, STAFF_PRESET_KEYS } from "@/lib/staff-presets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { setPermissionsAction } from "./actions";

export const metadata: Metadata = { title: "Roles & Permissions" };

const PERMS: { key: Permission; label: string }[] = [
  { key: "CHECKIN", label: "Check-in scanning" },
  { key: "VENDOR_VIEW", label: "View vendors" },
  { key: "VENDOR_MANAGE", label: "Manage vendors" },
  { key: "EVENT_VIEW", label: "View events" },
  { key: "CUSTOMER_VIEW", label: "View customers" },
  { key: "PAYMENT_VIEW", label: "Payments & analytics" },
];
const permLabel = (p: string) => PERMS.find((x) => x.key === p)?.label ?? p;

export default async function RolesPage() {
  await requireSuperAdmin();
  const staff = (await listStaff()).filter((s) => s.active);

  return (
    <div className="space-y-8">
      <PageHeader title="Roles & Permissions" description="Fine-tune what each teammate can access. SUPER_ADMIN can do everything; add or remove accounts on the Staff page." />

      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Preset roles</h2>
          <p className="text-sm text-muted-foreground">What each role bundle grants when you add a teammate.</p>
        </div>
        <div className="space-y-2 text-sm">
          {STAFF_PRESET_KEYS.map((k) => (
            <div key={k} className="flex flex-wrap items-center gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
              <span className="w-32 font-medium">{STAFF_PRESETS[k].label}</span>
              <div className="flex flex-wrap gap-1">
                {STAFF_PRESETS[k].permissions.map((p) => <Badge key={p} variant="primary">{permLabel(p)}</Badge>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="font-display text-lg font-semibold">Per-teammate permissions</h2>
        {staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active staff — add teammates on the <Link href="/admin/ops/staff" className="text-primary hover:underline">Staff</Link> page.</p>
        ) : (
          <div className="space-y-8">
            {staff.map((s) => (
              <form key={s.id} action={setPermissionsAction} className="border-t border-border pt-6 first:border-t-0 first:pt-0 space-y-3">
                <input type="hidden" name="id" value={s.id} />
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name ?? s.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <Button type="submit" size="sm" variant="outline">Save</Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {PERMS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="perm" value={p.key} defaultChecked={s.permissions.includes(p.key)} className="size-4" />
                      {p.label}
                    </label>
                  ))}
                </div>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
