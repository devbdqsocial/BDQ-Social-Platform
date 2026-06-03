import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { listStaff } from "@/server/staff/service";
import { STAFF_PRESETS, STAFF_PRESET_KEYS } from "@/lib/staff-presets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PageHeader } from "@/components/ui/page-header";
import { saveStaffAction } from "./actions";
import { StaffTable } from "./StaffTable";

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
        <StaffTable staff={staff} />
      </div>
    </div>
  );
}
