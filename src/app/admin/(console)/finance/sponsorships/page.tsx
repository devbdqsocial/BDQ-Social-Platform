import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { listSponsorships } from "@/server/finance/sponsorship";
import { listAllForAdmin } from "@/server/events/service";
import { formatPaise } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { saveSponsorshipAction, setSponsorshipStatusAction } from "./actions";

export const metadata: Metadata = { title: "Sponsorships" };

const STATUS_VARIANT = { PROPOSED: "neutral", SIGNED: "warning", PAID: "success" } as const;
const NEXT_STATUS = { PROPOSED: "SIGNED", SIGNED: "PAID" } as const;

export default async function SponsorshipsPage() {
  await requirePermission("FINANCE_MANAGE");
  const [sponsorships, events] = await Promise.all([listSponsorships(), listAllForAdmin()]);
  const paid = sponsorships.filter((s) => s.status === "PAID").reduce((sum, s) => sum + s.amountPaise, 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Sponsorships" description="Sponsorship income — a third revenue stream feeding P&L. Only PAID deals count as collected." />

      <form action={saveSponsorshipAction} className="space-y-6">
        <h2 className="text-lg font-semibold tracking-tight">New sponsorship</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sponsor name" className="sm:col-span-2">
            <Input name="sponsorName" required placeholder="Acme Beverages" />
          </Field>
          <Field label="Tier (optional)">
            <Input name="tier" placeholder="Title / Powered-by / Zone" />
          </Field>
          <Field label="Amount (₹)">
            <Input type="number" name="amountRupees" min={0} step="0.01" required placeholder="100000" />
          </Field>
          <Field label="Event">
            <Select name="eventId" defaultValue="">
              <option value="">Org-wide (no event)</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="PROPOSED">
              <option value="PROPOSED">Proposed</option>
              <option value="SIGNED">Signed</option>
              <option value="PAID">Paid</option>
            </Select>
          </Field>
          <Field label="Note" className="sm:col-span-2">
            <Input name="note" placeholder="Optional" />
          </Field>
          <Button type="submit" className="w-fit sm:col-span-2">Add sponsorship</Button>
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">
          All sponsorships ({sponsorships.length}) · {formatPaise(paid)} collected
        </h2>
        {sponsorships.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sponsorships yet.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {sponsorships.map((s) => {
              const next = NEXT_STATUS[s.status as keyof typeof NEXT_STATUS];
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      {s.sponsorName}
                      <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPaise(s.amountPaise)}
                      {s.tier ? ` · ${s.tier}` : ""} · {s.event?.name ?? "Org-wide"}
                    </p>
                  </div>
                  {next && (
                    <form action={setSponsorshipStatusAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="status" value={next} />
                      <Button type="submit" variant="ghost" size="sm">
                        {next === "SIGNED" ? "Mark signed" : "Mark paid"}
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
