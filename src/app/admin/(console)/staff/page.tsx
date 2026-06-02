import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { listStaff } from "@/server/staff/service";
import { STAFF_PRESETS, STAFF_PRESET_KEYS } from "@/lib/staff-presets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { saveStaffAction, removeStaffAction } from "./actions";

export const metadata: Metadata = { title: "Staff" };

export default async function AdminStaffPage() {
  await requireSuperAdmin();
  const staff = await listStaff();

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Staff" description="Add teammates and choose what each one can do. They sign in at /admin/login with their email + password." />

      <Card asChild>
        <form action={saveStaffAction}>
          <CardHeader>
            <CardTitle>Add or update a teammate</CardTitle>
            <CardDescription>Using an email that already exists updates that person.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              <Input name="name" placeholder="Priya from the gate team" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required placeholder="priya@bdqsocial.com" />
            </Field>
            <Field label="Role">
              <Select name="preset" required defaultValue="SCANNER_ONLY">
                {STAFF_PRESET_KEYS.map((k) => (
                  <option key={k} value={k}>{STAFF_PRESETS[k].label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Password" hint="Sets/Resets their sign-in password." className="sm:col-span-2">
              <PasswordInput name="password" autoComplete="new-password" placeholder="At least 8 characters" />
            </Field>
            <Button type="submit" className="w-fit sm:col-span-2">Save teammate</Button>
          </CardContent>
        </form>
      </Card>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Team ({staff.length})</h2>
        {staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teammates yet — add your first one above.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {staff.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{s.name ?? s.email}</span>
                    {!s.active && <Badge variant="neutral">No access</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {s.permissions.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      s.permissions.map((p) => <Badge key={p} variant="primary">{p.toLowerCase().replace(/_/g, " ")}</Badge>)
                    )}
                  </div>
                </div>
                {s.active && (
                  <form action={removeStaffAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="ghost" size="sm">Remove access</Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
