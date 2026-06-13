import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/server/auth/guard";
import { listAuditLogs, auditFilterOptions } from "@/server/audit-log";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { fmtDateTime } from "@/lib/date-formats";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

type SP = { entity?: string; action?: string; from?: string; to?: string; page?: string };

const fmt = fmtDateTime;

const roleVariant = (r: string | null) => (r === "SUPER_ADMIN" ? "primary" : r === "STAFF" ? "primary" : "neutral");

export default async function AuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const filters = { entity: sp.entity, action: sp.action, from: sp.from, to: sp.to };
  const page = Number(sp.page ?? "1") || 1;

  const [{ rows, total, pages, page: cur }, options] = await Promise.all([
    listAuditLogs(filters, page),
    auditFilterOptions(),
  ]);

  const filterQs = () => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) u.set(k, v);
    return u.toString();
  };
  const pageHref = (p: number) => {
    const u = new URLSearchParams(filterQs());
    u.set("page", String(p));
    return `/admin/system/audit?${u.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Every admin and staff action, newest first. Read-only and append-only."
        actions={
          <Button asChild size="sm" variant="outline">
            <a href={`/api/admin/export/audit${filterQs() ? `?${filterQs()}` : ""}`}>Export CSV</a>
          </Button>
        }
      />

      <form method="get" action="/admin/system/audit" className="grid items-end gap-3 sm:grid-cols-5">
        <Field label="Area">
          <Select name="entity" defaultValue={sp.entity ?? ""}>
            <option value="">All</option>
            {options.entities.map((e) => <option key={e} value={e}>{e}</option>)}
          </Select>
        </Field>
        <Field label="Action">
          <Select name="action" defaultValue={sp.action ?? ""}>
            <option value="">All</option>
            {options.actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
        </Field>
        <Field label="From">
          <Input type="date" name="from" defaultValue={sp.from ?? ""} />
        </Field>
        <Field label="To">
          <Input type="date" name="to" defaultValue={sp.to ?? ""} />
        </Field>
        <div className="flex gap-2">
          <Button type="submit">Apply</Button>
          <Button asChild variant="ghost"><Link href="/admin/system/audit">Clear</Link></Button>
        </div>
      </form>

      <p className="text-sm text-muted-foreground">
        {total === 0 ? "No matching entries" : `Showing ${rows.length} of ${total}`}
      </p>

      <ul className="divide-y divide-border border-y border-border">
        {rows.map((r) => {
          const hasDelta = r.before != null || r.after != null;
          return (
            <li key={r.id} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.action}</span>
                  <Badge variant="neutral">{r.entity}{r.entityId ? ` · ${r.entityId.slice(0, 10)}` : ""}</Badge>
                  {r.role && <Badge variant={roleVariant(r.role)}>{r.role.toLowerCase().replace(/_/g, " ")}</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{fmt(r.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.actor?.name ?? r.actor?.email ?? r.actorId ?? "system"}
                {r.ip ? ` · ${r.ip}` : ""}
              </p>
              {hasDelta && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-primary">before / after</summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
{JSON.stringify({ before: r.before, after: r.after }, null, 2)}
                  </pre>
                </details>
              )}
            </li>
          );
        })}
      </ul>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          {cur > 1 ? (
            <Button asChild variant="outline" size="sm"><Link href={pageHref(cur - 1)}>← Newer</Link></Button>
          ) : <span />}
          <span className="text-xs text-muted-foreground">Page {cur} of {pages}</span>
          {cur < pages ? (
            <Button asChild variant="outline" size="sm"><Link href={pageHref(cur + 1)}>Older →</Link></Button>
          ) : <span />}
        </div>
      )}
    </div>
  );
}
