"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { setResetPassword } from "./actions";

/** Single-step reset: set a new password, then go to sign in. */
export function ResetPassword({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await setResetPassword(token, password);
      setDone(true);
      router.replace("/admin/login");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not reset your password.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="grid gap-4">
      <Field label="New password" hint="At least 8 characters.">
        <PasswordInput
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErr(null); }}
          autoComplete="new-password"
          required
        />
      </Field>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" className="h-11" disabled={busy || done || password.length < 8}>{busy || done ? "Saving…" : "Set new password"}</Button>
    </form>
  );
}
