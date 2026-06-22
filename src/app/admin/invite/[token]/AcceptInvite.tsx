"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { TotpEnroll } from "@/components/auth/TotpEnroll";
import { setInvitePassword, startInviteEnrollment, confirmInviteEnrollment } from "./actions";

/** Two-step invite: set password, enroll 2FA, save backup codes, then sign in. */
export function AcceptInvite({ token, needsPassword }: { token: string; needsPassword: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "2fa">(needsPassword ? "password" : "2fa");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const savePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await setInvitePassword(token, password);
      setStep("2fa");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save password.");
    } finally {
      setBusy(false);
    }
  };

  if (step === "password") {
    return (
      <form onSubmit={savePassword} className="grid gap-4">
        <Field label="Create a password" hint="At least 8 characters.">
          <PasswordInput
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErr(null); }}
            autoComplete="new-password"
            required
          />
        </Field>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="h-11" disabled={busy || password.length < 8}>{busy ? "Saving…" : "Continue"}</Button>
      </form>
    );
  }

  return (
    <TotpEnroll
      start={() => startInviteEnrollment(token)}
      confirm={(code) => confirmInviteEnrollment(token, code)}
      autoStart
      finalCta="Go to sign in"
      onDone={() => { router.replace("/admin/login"); router.refresh(); }}
    />
  );
}
