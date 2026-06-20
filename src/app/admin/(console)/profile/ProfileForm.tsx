"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SecurityPanel } from "./SecurityPanel";
import { updateProfileAction, updatePasswordAction, updatePreferencesAction, logoutAllAction } from "./actions";

interface Prefs {
  locale?: string | null;
  timezone?: string | null;
  dateFormat?: string | null;
  currency?: string | null;
}
interface LoginEvent {
  at: string;
  ip: string | null;
  ua: string | null;
}
interface ProfileFormProps {
  initialData: {
    name: string | null;
    designation: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    prefs: Prefs;
  };
  totpEnabled: boolean;
  role: string;
  loginHistory: LoginEvent[];
}

/** Tabbed self-service My Profile: Personal · Account (password, 2FA, sign-in history) · Preferences. */
export function ProfileForm({ initialData, totpEnabled, role, loginHistory }: ProfileFormProps) {
  const [busy, setBusy] = useState(false);

  const wrap = (action: (fd: FormData) => Promise<void>, ok: string) => async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      await action(formData);
      toast.success(ok);
      const pwd = form.querySelector('input[name="password"]') as HTMLInputElement | null;
      if (pwd) pwd.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const prefs = initialData.prefs ?? {};

  return (
    <Tabs defaultValue="personal" orientation="horizontal">
      <TabsList>
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
      </TabsList>

      {/* Personal */}
      <TabsContent value="personal">
        <form onSubmit={wrap(updateProfileAction, "Profile updated.")} className="grid gap-4 sm:grid-cols-2 pt-2">
          <Field label="Name" className="sm:col-span-2">
            <Input name="name" defaultValue={initialData.name || ""} placeholder="Your name" />
          </Field>
          <Field label="Designation" className="sm:col-span-2" hint="e.g. Founder, Operations Lead">
            <Input name="designation" defaultValue={initialData.designation || ""} placeholder="Your title" />
          </Field>
          <Field label="Email">
            <Input value={initialData.email || ""} disabled className="bg-muted opacity-70 cursor-not-allowed" />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={initialData.phone || ""} placeholder="Mobile number" />
          </Field>
          <Field label="WhatsApp" className="sm:col-span-2">
            <Input name="whatsapp" defaultValue={initialData.whatsapp || ""} placeholder="WhatsApp number" />
          </Field>
          <Button type="submit" className="w-fit sm:col-span-2" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </form>
      </TabsContent>

      {/* Account */}
      <TabsContent value="account">
        <div className="grid gap-6 pt-2">
          <form onSubmit={wrap(updatePasswordAction, "Password updated.")} className="grid gap-3">
            <Field label="Change password" hint="At least 8 characters. Signs out other devices.">
              <PasswordInput name="password" placeholder="New password" autoComplete="new-password" />
            </Field>
            <Button type="submit" className="w-fit" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
          </form>

          <div className="border-t pt-4">
            <SecurityPanel totpEnabled={totpEnabled} role={role} />
          </div>

          <div className="border-t pt-4 grid gap-2">
            <p className="font-medium text-sm">Sign-in history</p>
            {loginHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recorded sign-ins yet.</p>
            ) : (
              <ul className="grid gap-1 text-xs text-muted-foreground">
                {loginHistory.map((e, i) => (
                  <li key={i} className="flex flex-wrap gap-x-3">
                    <span className="font-mono">{new Date(e.at).toLocaleString()}</span>
                    {e.ip && <span>{e.ip}</span>}
                    {e.ua && <span className="truncate max-w-[18rem]">{e.ua}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t pt-4 grid gap-2">
            <p className="font-medium text-sm">Active sessions</p>
            <p className="text-xs text-muted-foreground">Sign out of every device, including this one.</p>
            <form action={logoutAllAction}>
              <Button type="submit" variant="outline" className="w-fit text-destructive">Log out all devices</Button>
            </form>
          </div>
        </div>
      </TabsContent>

      {/* Preferences */}
      <TabsContent value="preferences">
        <form onSubmit={wrap(updatePreferencesAction, "Preferences saved.")} className="grid gap-4 sm:grid-cols-2 pt-2">
          <Field label="Language">
            <Input name="locale" defaultValue={prefs.locale || ""} placeholder="en-IN" />
          </Field>
          <Field label="Timezone">
            <Input name="timezone" defaultValue={prefs.timezone || ""} placeholder="Asia/Kolkata" />
          </Field>
          <Field label="Date format">
            <Input name="dateFormat" defaultValue={prefs.dateFormat || ""} placeholder="DD/MM/YYYY" />
          </Field>
          <Field label="Currency">
            <Input name="currency" defaultValue={prefs.currency || ""} placeholder="INR" />
          </Field>
          <Button type="submit" className="w-fit sm:col-span-2" disabled={busy}>{busy ? "Saving…" : "Save preferences"}</Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
