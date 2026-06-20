import type { Metadata } from "next";
import Link from "next/link";
import { Download, Database } from "lucide-react";
import { requireAdminRole } from "@/server/auth/guard";
import { getDbSize } from "@/server/settings/backup";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Backup & Recovery" };

type Export = { label: string; href: string; superOnly?: boolean };
const EXPORTS: Export[] = [
  { label: "Orders (paid)", href: "/api/admin/export/orders" },
  { label: "Expenses", href: "/api/admin/export/expenses" },
  { label: "Audit log", href: "/api/admin/export/audit", superOnly: true },
];

/** Data exports + database size. P&L exports are per-event under Finance. */
export default async function BackupPage() {
  const session = await requireAdminRole();
  const size = await getDbSize();
  const exports = EXPORTS.filter((e) => !e.superOnly || session.role === "SUPER_ADMIN");

  return (
    <div className="space-y-6">
      <PageHeader title="Backup & Recovery" description="Export your data as CSV. Each export reflects current records." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Database className="size-4 text-primary" /> Database</CardTitle>
          <CardDescription>Total size of the Postgres database.</CardDescription>
        </CardHeader>
        <CardContent><p className="text-2xl font-semibold">{size}</p></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exports</CardTitle>
          <CardDescription>P&amp;L exports are available per event under Finance.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {exports.map((e) => (
            <Button key={e.href} asChild variant="outline" className="gap-2">
              <a href={e.href}><Download className="size-4" /> {e.label}</a>
            </Button>
          ))}
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/admin/finance/pnl">P&amp;L (per event) →</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
