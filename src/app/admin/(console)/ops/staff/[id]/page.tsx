import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/server/auth/guard";
import { getStaffDetail } from "@/server/staff/service";
import { fmtDateTime } from "@/lib/date-formats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StaffRowActions } from "@/components/admin/tables/StaffRowActions";
import { permissionShort } from "@/lib/permissions";

export const metadata: Metadata = { title: "Teammate" };

const roleBadge = (role: string) =>
  role === "SUPER_ADMIN" ? { label: "Super Admin", variant: "primary" as const }
  : role === "ADMIN" ? { label: "Admin", variant: "primary" as const }
  : { label: "Staff", variant: "neutral" as const };

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminRole();
  const { id } = await params;
  const u = await getStaffDetail(id);
  if (!u) notFound();

  const role = roleBadge(u.role);
  const isPrivileged = u.role === "ADMIN" || u.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold">{u.name ?? u.email}</h1>
          <Badge variant={role.variant}>{role.label}</Badge>
          {u.active ? <Badge variant="success">Active</Badge> : <Badge variant="warning">Pending setup</Badge>}
        </div>
        <Link href="/admin/ops/staff" className="shrink-0 text-sm text-muted-foreground hover:text-foreground">← All teammates</Link>
      </div>

      <div className="flex items-center gap-1">
        <StaffRowActions
          user={{ id: u.id, name: u.name, email: u.email, role: u.role, permissions: u.permissions, active: u.active }}
          currentUserRole={session.role}
          showDetails={false}
        />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="grid gap-2 pt-0 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Email:</span> {u.email ?? "—"}</p>
          <p><span className="text-muted-foreground">Added:</span> {fmtDateTime(u.createdAt)}</p>
          <p className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Permissions:</span>
            {isPrivileged ? (
              <span className="italic text-muted-foreground text-xs">All permissions (unrestricted)</span>
            ) : u.permissions.length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              u.permissions.map((p) => <Badge key={p} variant="primary">{permissionShort(p)}</Badge>)
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Security</CardTitle></CardHeader>
        <CardContent className="grid gap-2 pt-0 text-sm sm:grid-cols-2">
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">Two-factor:</span>
            <Badge variant={u.totpEnabled ? "success" : "warning"}>{u.totpEnabled ? "Enabled" : "Not set up"}</Badge>
          </p>
          <p><span className="text-muted-foreground">Sign-in:</span> {u.active ? "Password set" : "Not set up yet"}</p>
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">Last login:</span>{" "}
            {u.lastLoginAt ? `${fmtDateTime(u.lastLoginAt)}${u.lastLoginIp ? ` · ${u.lastLoginIp}` : ""}` : "never"}
          </p>
          <p className="sm:col-span-2 text-xs text-muted-foreground">Sessions are stateless — use “Sign out everywhere” above to revoke all devices.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
        <CardContent className="pt-0 text-sm">
          {u.activity.length === 0 ? (
            <p className="text-muted-foreground">No recorded activity yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {u.activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="font-medium">{a.action}</span>
                    <span className="text-muted-foreground"> · {a.entity}{a.actorId === u.id ? "" : " (by another admin)"}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
