import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { createVendorAction } from "../actions";

export const metadata: Metadata = { title: "Add vendor" };

export default async function NewVendorPage() {
  await requirePermission("VENDOR_MANAGE");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <PageHeader title="Add a vendor" description="Create the account by phone, add their brand details, then assign a stall." />
        <Link href="/admin/vendors" className="shrink-0 text-sm text-muted-foreground hover:text-foreground">← All vendors</Link>
      </div>

      <Card asChild>
        <form action={createVendorAction}>
          <CardHeader>
            <CardTitle>Vendor details</CardTitle>
            <CardDescription>The vendor can later sign into the vendor portal with this number.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone number" hint="They'll log in with this.">
                <Input name="phone" required placeholder="+91 98765 43210" inputMode="tel" autoComplete="off" />
              </Field>
              <Field label="Contact name" hint="Optional">
                <Input name="name" placeholder="Owner / point of contact" />
              </Field>
            </div>
            <Field label="Brand name">
              <Input name="brandName" required placeholder="The stall's display name" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" hint="Optional">
                <Input name="category" placeholder="Food, fashion, decor…" />
              </Field>
              <Field label="Instagram" hint="Optional">
                <Input name="instagram" placeholder="@handle" />
              </Field>
            </div>
            <Field label="Website" hint="Optional">
              <Input name="website" placeholder="https://…" />
            </Field>
            <Field label="Description" hint="Optional">
              <Textarea name="description" rows={2} placeholder="A line about the brand." />
            </Field>
            <Button type="submit" className="w-fit">Create vendor</Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
