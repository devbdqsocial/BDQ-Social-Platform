import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { listCoupons } from "@/server/coupons/admin-service";
import { listAllForAdmin } from "@/server/events/service";
import { formatPaise } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { saveCouponAction, toggleCouponAction } from "./actions";

export const metadata: Metadata = { title: "Coupons" };

const fmtDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(d) : null;

export default async function CouponsPage() {
  await requireSuperAdmin();
  const [coupons, events] = await Promise.all([listCoupons(), listAllForAdmin()]);

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Coupons" description="Create promo codes. Discounts apply at checkout (best single discount wins — they don't stack)." />

      <Card asChild>
        <form action={saveCouponAction}>
          <CardHeader>
            <CardTitle>New coupon</CardTitle>
            <CardDescription>Codes are case-sensitive and must be unique.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" className="sm:col-span-2">
              <Input name="code" required placeholder="SAVE20" />
            </Field>
            <Field label="Type">
              <Select name="type" defaultValue="PERCENT">
                <option value="PERCENT">Percent off</option>
                <option value="FLAT">Flat ₹ off</option>
              </Select>
            </Field>
            <Field label="Value" hint="Percent (0–100) or ₹ for flat.">
              <Input type="number" name="value" min={0} required placeholder="20" />
            </Field>
            <Field label="Max uses" hint="Blank = unlimited.">
              <Input type="number" name="maxUses" min={1} />
            </Field>
            <Field label="Per-user limit">
              <Input type="number" name="perUserLimit" min={1} defaultValue={1} />
            </Field>
            <Field label="Minimum order (₹)" hint="Optional.">
              <Input type="number" name="minOrderRupees" min={0} />
            </Field>
            <Field label="Event scope">
              <Select name="eventId" defaultValue="">
                <option value="">All events</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </Field>
            <Field label="Starts">
              <Input type="date" name="startsAt" />
            </Field>
            <Field label="Ends">
              <Input type="date" name="endsAt" />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="active" defaultChecked className="size-4" /> Active
            </label>
            <Button type="submit" className="w-fit sm:col-span-2">Create coupon</Button>
          </CardContent>
        </form>
      </Card>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">All coupons ({coupons.length})</h2>
        {coupons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No coupons yet — create your first one above.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {coupons.map((c) => {
              const window = [fmtDate(c.startsAt), fmtDate(c.endsAt)].filter(Boolean).join(" → ");
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="font-mono">{c.code}</span>
                      <Badge variant={c.active ? "success" : "neutral"}>{c.active ? "Active" : "Off"}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.type === "PERCENT" ? `${c.value}% off` : `${formatPaise(c.value)} off`}
                      {" · "}used {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}
                      {c.minOrder ? ` · min ${formatPaise(c.minOrder)}` : ""}
                      {" · "}{c.event?.name ?? "All events"}
                      {window ? ` · ${window}` : ""}
                    </p>
                  </div>
                  <form action={toggleCouponAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={String(!c.active)} />
                    <Button type="submit" variant="ghost" size="sm">{c.active ? "Turn off" : "Turn on"}</Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
