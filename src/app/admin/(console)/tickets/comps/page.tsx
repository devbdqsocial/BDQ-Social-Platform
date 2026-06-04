import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/server/auth/guard";
import { listEventsWithTicketTypes, listCompBatches } from "@/server/comps/service";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { generateCompsAction } from "./actions";

export const metadata: Metadata = { title: "Comp tickets" };

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function CompsPage() {
  await requireSuperAdmin();
  const [events, batches] = await Promise.all([listEventsWithTicketTypes(), listCompBatches()]);
  const hasTypes = events.some((e) => e.ticketTypes.length > 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Comp tickets" description="Issue free VIP / sponsor / press tickets with real QR codes — no payment." />

      <form action={generateCompsAction} className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Issue comps</h2>
          <p className="text-sm text-muted-foreground">Tickets are generated instantly. Add an email to send them, or print the QR sheet.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ticket type" className="sm:col-span-2">
            <Select name="ticketTypeId" required defaultValue="">
              <option value="" disabled>Choose…</option>
              {events.map((e) => (
                <optgroup key={e.id} label={e.name}>
                  {e.ticketTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="How many">
            <Input type="number" name="qty" min={1} max={200} defaultValue={1} required />
          </Field>
          <Field label="Recipient name" hint="Optional — printed on the sheet.">
            <Input name="holderName" placeholder="Sponsor / guest name" />
          </Field>
          <Field label="Recipient phone" hint="Optional.">
            <Input name="holderPhone" />
          </Field>
          <Field label="Recipient email" hint="Optional — emails the tickets.">
            <Input name="holderEmail" type="email" />
          </Field>
          <Button type="submit" className="w-fit sm:col-span-2" disabled={!hasTypes}>Generate</Button>
          {!hasTypes && <p className="text-xs text-muted-foreground sm:col-span-2">Add a ticket type to an event first.</p>}
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Recent comp batches</h2>
        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comps issued yet.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {batches.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{b._count.tickets} × {b.tickets[0]?.ticketType.name ?? "ticket"} · {b.event.name}</p>
                  <p className="text-xs text-muted-foreground">{b.tickets[0]?.holderName ?? "—"} · {fmt(b.createdAt)}</p>
                </div>
                <Button asChild variant="outline" size="sm"><Link href={`/admin/tickets/comps/${b.id}`}>View QR</Link></Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
