import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { requireAdminRole } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { listStallTypes } from "@/server/map/stall-types";
import { listEventAssignments, listPublishedDocs } from "@/server/legal/docs";
import { PRODUCT_CATEGORIES } from "@/server/schemas";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { assignDocAction, unassignDocAction } from "../actions";

export const metadata: Metadata = { title: "Event assignments" };

function RemoveButton({ id, label }: { id: string; label: string }) {
  return (
    <form action={unassignDocAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" title={label} aria-label={label}>
        <X className="size-4" />
      </Button>
    </form>
  );
}

export default async function AdminLegalAssignmentsPage() {
  await requireAdminRole();
  const { active } = await getActiveEvent();
  if (!active) {
    return (
      <div className="space-y-4">
        <PageHeader title="Event assignments" description="Pick or create an event to assign documents." />
        <p className="text-sm text-muted-foreground">No active event. Choose one from the event switcher.</p>
      </div>
    );
  }

  const [stallTypes, assignments, contracts, allPublished] = await Promise.all([
    listStallTypes(active.id),
    listEventAssignments(active.id),
    listPublishedDocs({ category: ["CONTRACT"] }),
    listPublishedDocs(),
  ]);

  const contractRows = assignments.filter((a) => a.kind === "BOOKING_CONTRACT");
  const eventDefault = contractRows.find((a) => !a.stallType && !a.vendorCategory);
  const exceptions = contractRows.filter((a) => a.stallType || a.vendorCategory);
  const ruleAssignments = assignments.filter((a) => a.kind !== "BOOKING_CONTRACT");

  const contractOptions = (
    <>
      <option value="">— pick a contract —</option>
      {contracts.map((c) => (
        <option key={c.id} value={c.id}>
          {c.title} ({c.version})
        </option>
      ))}
    </>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Event assignments" description={`Which documents apply at ${active.name} — in plain terms.`} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What vendors sign</CardTitle>
            <CardDescription>
              Every stall booking uses the default contract below — unless an exception matches. A stall-type exception wins over a
              vendor-category exception (e.g. &ldquo;Food &amp; Beverage&rdquo;). No default set = the global Stall Booking Agreement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">All stalls sign</p>
              <form action={assignDocAction} className="mt-1.5 flex items-center gap-2">
                <input type="hidden" name="eventId" value={active.id} />
                <input type="hidden" name="kind" value="BOOKING_CONTRACT" />
                <input type="hidden" name="target" value="" />
                <Select name="docId" defaultValue={eventDefault?.doc.id ?? ""} className="max-w-xs">
                  {contractOptions}
                </Select>
                <Button type="submit" size="sm" variant="outline">Set</Button>
                {eventDefault && <RemoveButton id={eventDefault.id} label="Remove default contract" />}
              </form>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-sm font-medium">Except…</p>
              {exceptions.length > 0 ? (
                <ul className="mt-1 divide-y divide-border">
                  {exceptions.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span>
                        <span className="font-medium">{a.stallType ? `${a.stallType.name} stalls` : `${a.vendorCategory} vendors`}</span>
                        <span className="text-muted-foreground"> sign </span>
                        {a.doc.title} <span className="text-xs text-muted-foreground">({a.doc.version})</span>
                      </span>
                      <RemoveButton id={a.id} label="Remove exception" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No exceptions — everyone signs the default.</p>
              )}
              <form action={assignDocAction} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="eventId" value={active.id} />
                <input type="hidden" name="kind" value="BOOKING_CONTRACT" />
                <Select name="target" defaultValue="" className="max-w-[14rem]">
                  <option value="">— who? —</option>
                  <optgroup label="Vendor categories">
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={`vc:${c}`}>{c} vendors</option>
                    ))}
                  </optgroup>
                  {stallTypes.length > 0 && (
                    <optgroup label="Stall types">
                      {stallTypes.map((st) => (
                        <option key={st.id} value={`st:${st.id}`}>{st.name} stalls</option>
                      ))}
                    </optgroup>
                  )}
                </Select>
                <span className="text-sm text-muted-foreground">sign</span>
                <Select name="docId" defaultValue="" className="max-w-xs">
                  {contractOptions}
                </Select>
                <Button type="submit" size="sm">Add exception</Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shown to customers &amp; vendors</CardTitle>
            <CardDescription>
              These documents appear on the public event page (&ldquo;Good to know&rdquo;) and in each vendor&apos;s Documents hub for
              this event.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ruleAssignments.length > 0 ? (
              <ul className="divide-y divide-border">
                {ruleAssignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      {a.doc.title} <span className="text-xs text-muted-foreground">({a.doc.version})</span>
                      <Badge variant="neutral">{a.kind === "EVENT_RULES" ? "Rules" : "Policy"}</Badge>
                    </span>
                    <RemoveButton id={a.id} label="Stop showing this document" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing assigned yet.</p>
            )}
            <form action={assignDocAction} className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <input type="hidden" name="eventId" value={active.id} />
              <Select name="docId" defaultValue="" className="max-w-xs">
                <option value="">— pick a document —</option>
                {allPublished.map((d) => (
                  <option key={d.id} value={d.id}>{d.title} ({d.version})</option>
                ))}
              </Select>
              <Select name="kind" defaultValue="EVENT_RULES" className="max-w-[9rem]">
                <option value="EVENT_RULES">as Rules</option>
                <option value="EVENT_POLICY">as Policy</option>
              </Select>
              <Button type="submit" size="sm">Show it</Button>
            </form>
            <p className="text-xs text-muted-foreground">
              Manage the documents themselves in the <Link href="/admin/legal" className="text-primary hover:underline">Document Library</Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
