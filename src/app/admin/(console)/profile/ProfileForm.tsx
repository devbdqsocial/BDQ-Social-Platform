"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { updateProfileAction } from "./actions";

interface ProfileFormProps {
  initialData: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
}

/**
 * Client component form to allow admins to edit their name, phone number, and password.
 * Handles submittals asynchronously and displays success/error toasts.
 */
export function ProfileForm({ initialData }: ProfileFormProps) {
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updateProfileAction(formData);
      toast.success("Profile updated successfully.");
      const pwdInput = e.currentTarget.querySelector('input[name="password"]') as HTMLInputElement;
      if (pwdInput) {
        pwdInput.value = "";
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <Input name="name" defaultValue={initialData.name || ""} placeholder="Your name" />
        </Field>
        <Field label="Email">
          <Input name="email" value={initialData.email || ""} disabled className="bg-muted opacity-70 cursor-not-allowed" />
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={initialData.phone || ""} placeholder="Mobile number" />
        </Field>
        <Field label="Update Password" hint="Leave blank to keep your current password." className="sm:col-span-2">
          <PasswordInput name="password" placeholder="At least 8 characters" autoComplete="new-password" />
        </Field>
        <Button type="submit" className="w-fit sm:col-span-2" disabled={busy}>
          {busy ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
