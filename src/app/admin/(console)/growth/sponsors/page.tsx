import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/guard";
import { listSponsors, SponsorWithFinance } from "@/server/sponsors/service";
import { listAllForAdmin } from "@/server/events/service";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { createSponsorAction, updateSponsorAction } from "./actions";
import { SponsorsTable } from "./SponsorsTable";

export const metadata: Metadata = { title: "Sponsors" };
export const dynamic = "force-dynamic";

const TIERS = ["TITLE", "POWERED_BY", "ZONE", "STALL", "ASSOCIATE"] as const;
const tierLabel = (t: string) => t.toLowerCase().replace(/_/g, " ");

const STATUS_OPTIONS = [
  { value: "PROPOSED", label: "Proposed" },
  { value: "SIGNED", label: "Signed" },
  { value: "PAID", label: "Paid" },
];

export default async function SponsorsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; editId?: string }>;
}) {
  const session = await requireAdmin();
  const hasFinance =
    session.role === "SUPER_ADMIN" ||
    session.role === "ADMIN" ||
    session.permissions.includes("FINANCE_MANAGE");

  const events = await listAllForAdmin();
  const { eventId, editId } = await searchParams;
  const activeId = eventId || events[0]?.id;
  const sponsors = activeId ? (await listSponsors(activeId)) as SponsorWithFinance[] : [];

  const editSponsor = editId ? sponsors.find((s) => s.id === editId) : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sponsors"
        description="Add partners and their logos — they appear on the landing page and the event page."
        actions={
          <form method="get" action="/sponsors" className="flex items-end gap-2">
            <Select name="eventId" defaultValue={activeId} className="w-56">
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" variant="outline">
              Switch
            </Button>
          </form>
        }
      />

      {activeId && (
        <form action={editSponsor ? updateSponsorAction : createSponsorAction} className="space-y-6">
          <input type="hidden" name="eventId" value={activeId} />
          {editSponsor && <input type="hidden" name="id" value={editSponsor.id} />}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">
              {editSponsor ? "Edit sponsor" : "Add a sponsor"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Paste a hosted logo URL, or leave it blank to show the name.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input name="name" required defaultValue={editSponsor?.name} placeholder="Acme Co." />
            </Field>
            <Field label="Tier">
              <Select name="tier" defaultValue={editSponsor?.tier ?? "ASSOCIATE"}>
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {tierLabel(t)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Logo URL" hint="Optional." className="sm:col-span-2">
              <Input
                name="logoUrl"
                type="url"
                defaultValue={editSponsor?.logoUrl ?? ""}
                placeholder="https://…/logo.png"
              />
            </Field>

            {hasFinance && (
              <>
                <Field label="Amount (₹)">
                  <Input
                    type="number"
                    name="amountRupees"
                    min={0}
                    step="0.01"
                    defaultValue={editSponsor ? (editSponsor.amountPaise / 100).toString() : ""}
                    placeholder="0"
                  />
                </Field>
                <Field label="Payment Status">
                  <Select name="status" defaultValue={editSponsor?.status ?? "PROPOSED"}>
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Note" className="sm:col-span-2">
                  <Input
                    name="note"
                    defaultValue={editSponsor?.note ?? ""}
                    placeholder="Optional payment details or barter info"
                  />
                </Field>
              </>
            )}

            <div className="flex items-center gap-2 sm:col-span-2">
              <Button type="submit" className="w-fit">
                {editSponsor ? "Save changes" : "Add sponsor"}
              </Button>
              {editSponsor && (
                <Button asChild variant="outline" className="w-fit">
                  <a href={`/sponsors?eventId=${activeId}`}>Cancel</a>
                </Button>
              )}
            </div>
          </div>
        </form>
      )}

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Sponsors ({sponsors.length})</h2>
        <SponsorsTable sponsors={sponsors} hasFinance={hasFinance} activeEventId={activeId} />
      </div>
    </div>
  );
}
