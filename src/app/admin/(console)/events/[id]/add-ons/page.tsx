import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDateTime } from "@/lib/date-formats";
import { requireAdminRole } from "@/server/auth/guard";
import { db } from "@/server/db";
import { listAddOnsForAdmin, listAddOnOrders } from "@/server/addons/service";
import { formatPaise } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createAddOnAction, updateAddOnAction, deleteAddOnAction } from "./actions";

export const metadata: Metadata = { title: "Stall add-ons" };

export default async function AdminAddOnsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminRole();
  const { id } = await params;
  const event = await db.event.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!event) notFound();

  const [addOns, orders] = await Promise.all([listAddOnsForAdmin(id), listAddOnOrders(id)]);
  const revenue = orders.reduce((s, o) => s + o.totalPaise, 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/admin/events/${id}`} className="text-sm text-muted-foreground hover:text-foreground">← {event.name}</Link>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Stall add-ons</h1>
        <p className="mt-1 text-sm text-muted-foreground">Extras BOOKED vendors can order (table, chairs, power, signage). Prices in ₹; stock optional.</p>
      </div>

      {/* Existing add-ons — each row is its own update form. */}
      {addOns.length > 0 && (
        <div className="space-y-3">
          {addOns.map((a) => (
            <Card key={a.id} asChild>
              <form action={updateAddOnAction}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="eventId" value={id} />
                <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
                  <Field label="Name" className="sm:col-span-2"><Input name="name" required defaultValue={a.name} /></Field>
                  <Field label="Price (₹)"><Input type="number" name="priceRupees" min={1} required defaultValue={a.pricePaise / 100} /></Field>
                  <Field label="Max per stall"><Input type="number" name="maxPerBooking" min={1} defaultValue={a.maxPerBooking} /></Field>
                  <Field label="Stock" hint="Blank = unlimited"><Input type="number" name="stock" min={0} defaultValue={a.stock ?? ""} /></Field>
                  <Field label="Sold"><Input value={a.sold} disabled /></Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="active" defaultChecked={a.active} className="size-4" /> Active (shown to vendors)
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" size="sm">Save</Button>
                  </div>
                </CardContent>
              </form>
            </Card>
          ))}
          {/* Delete is a separate form so Save doesn't carry it. */}
          <div className="flex flex-wrap gap-2">
            {addOns.map((a) => (
              <form key={a.id} action={deleteAddOnAction}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="eventId" value={id} />
                <Button type="submit" variant="ghost" size="sm">Delete “{a.name}”</Button>
              </form>
            ))}
          </div>
        </div>
      )}

      {/* New add-on */}
      <Card asChild>
        <form action={createAddOnAction}>
          <input type="hidden" name="eventId" value={id} />
          <CardHeader>
            <CardTitle className="text-base">Add an add-on</CardTitle>
            <CardDescription>Vendors order these after their stall is BOOKED, until 48h before the event.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2"><Input name="name" required placeholder="Folding table, Power point (5A)…" /></Field>
            <Field label="Price (₹)"><Input type="number" name="priceRupees" min={1} required placeholder="300" /></Field>
            <Field label="Max per stall" hint="Default 5"><Input type="number" name="maxPerBooking" min={1} placeholder="5" /></Field>
            <Field label="Stock" hint="Blank = unlimited"><Input type="number" name="stock" min={0} /></Field>
            <Button type="submit" className="w-fit sm:col-span-2">Add add-on</Button>
          </CardContent>
        </form>
      </Card>

      {/* Orders */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Orders ({orders.length}) · {formatPaise(revenue)}</h2>
          {orders.length > 0 && (
            <Button asChild size="sm" variant="outline">
              <a href={`/api/admin/events/${id}/addon-orders/export`}>Export CSV</a>
            </Button>
          )}
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No paid add-on orders yet.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{o.booking.vendorProfile?.brandName ?? "—"} · Stall {o.booking.stall.label}</p>
                  <p className="text-xs text-muted-foreground">{o.lines.map((l) => `${l.qty}× ${l.addOn.name}`).join(", ")}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium">{formatPaise(o.totalPaise)}</p>
                  <p className="text-xs text-muted-foreground">{o.payment ? fmtDateTime(o.payment.createdAt) : ""}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
