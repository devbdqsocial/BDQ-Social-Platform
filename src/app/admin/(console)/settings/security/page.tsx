import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/server/auth/guard";
import { securityOverview } from "@/server/settings/security";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ForceLogoutButton } from "./ForceLogoutButton";

export const metadata: Metadata = { title: "Security Center" };

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

/** Admin-access overview: 2FA coverage, recent sign-ins, active login locks, and force-logout. */
export default async function SecurityCenterPage() {
  await requireSuperAdmin();
  const o = await securityOverview();

  return (
    <div className="space-y-6">
      <PageHeader title="Security Center" description="Admin access, 2FA coverage, and recent sign-ins." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Admin & staff accounts" value={o.adminCount} />
        <Stat label="2FA enabled" value={`${o.with2fa}/${o.adminCount}`} />
        <Stat label="Active login locks" value={o.activeLocks} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent admin sign-ins</CardTitle>
          <CardDescription>Last 10 successful logins across all admins.</CardDescription>
        </CardHeader>
        <CardContent>
          {o.recentLogins.length === 0 ? (
            <p className="text-xs text-muted-foreground">No sign-ins recorded yet.</p>
          ) : (
            <ul className="grid gap-1 text-xs text-muted-foreground">
              {o.recentLogins.map((l, i) => (
                <li key={i} className="flex flex-wrap gap-x-3">
                  <span className="font-mono">{new Date(l.at).toLocaleString()}</span>
                  {l.email && <span className="text-foreground">{l.email}</span>}
                  {l.ip && <span>{l.ip}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security actions</CardTitle>
          <CardDescription>Revoke sessions or review the full audit trail.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <ForceLogoutButton />
          <Button asChild variant="outline"><Link href="/admin/system/audit">View audit logs</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
