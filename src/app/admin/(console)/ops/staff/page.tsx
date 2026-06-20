import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { requireAdminRole } from "@/server/auth/guard";
import { listStaff } from "@/server/staff/service";
import { STAFF_PRESETS, STAFF_PRESET_KEYS } from "@/lib/staff-presets";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PageHeader } from "@/components/ui/page-header";
import { saveStaffAction, inviteStaffAction } from "./actions";
import { StaffTable } from "@/components/admin/tables/StaffTable";

export const metadata: Metadata = { title: "Staff" };

/**
 * Renders the Staff management page dashboard.
 * The page serves as a self-contained panel for creating and updating staff members.
 * It dynamically limits which roles can be managed depending on the session user's permissions:
 * - A SUPER_ADMIN can create and manage standard staff presets and other ADMIN roles.
 * - An ADMIN can only create and manage standard staff presets and cannot see or select the ADMIN option.
 */
export default async function AdminStaffPage() {
  const session = await requireAdminRole();
  const staff = await listStaff();

  const isSuperAdmin = session.role === "SUPER_ADMIN";

  return (
    <div className="space-y-8">
      <PageHeader title="Staff" description="Add teammates and choose what each one can do. They sign in at /admin/login with their email + password." />

      <ActionForm action={saveStaffAction} success="Teammate saved" resetOnSuccess className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Add or update a teammate</h2>
          <p className="text-sm text-muted-foreground">Using an email that already exists updates that person.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input name="name" placeholder="Priya from the gate team" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required placeholder="priya@bdqsocial.com" />
          </Field>
          <Field label="Role">
            <Select name="preset" required defaultValue="SCANNER_ONLY">
              {isSuperAdmin && (
                <option value="ADMIN">Administrator (Access all but logs)</option>
              )}
              {STAFF_PRESET_KEYS.map((k) => (
                <option key={k} value={k}>{STAFF_PRESETS[k].label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Password" hint="Sets/Resets their sign-in password." className="sm:col-span-2">
            <PasswordInput name="password" autoComplete="new-password" placeholder="At least 8 characters" />
          </Field>
          <Button type="submit" className="w-fit sm:col-span-2">Save teammate</Button>
        </div>
      </ActionForm>

      <ActionForm action={inviteStaffAction} success="Invite sent" resetOnSuccess className="space-y-6 rounded-lg border p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Invite by email (recommended)</h2>
          <p className="text-sm text-muted-foreground">They set their own password and enable 2FA from a secure link — you never handle a password.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input name="name" placeholder="Priya from the gate team" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required placeholder="priya@bdqsocial.com" />
          </Field>
          <Field label="Role">
            <Select name="preset" required defaultValue="SCANNER_ONLY">
              {isSuperAdmin && <option value="ADMIN">Administrator (Access all but logs)</option>}
              {STAFF_PRESET_KEYS.map((k) => (
                <option key={k} value={k}>{STAFF_PRESETS[k].label}</option>
              ))}
            </Select>
          </Field>
          <Button type="submit" variant="outline" className="w-fit sm:col-span-2">Send invite</Button>
        </div>
      </ActionForm>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Team ({staff.length})</h2>
        <StaffTable staff={staff} currentUserRole={session.role} />
      </div>
    </div>
  );
}

