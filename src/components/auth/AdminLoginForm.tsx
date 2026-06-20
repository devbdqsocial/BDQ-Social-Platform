"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { email as emailSchema, totp6, digitsCapped } from "@/lib/validators";
import { useFieldValidation } from "@/lib/use-field-validation";

export function AdminLoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const emailField = useFieldValidation(emailSchema);
  const codeField = useFieldValidation(totp6);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const emailOk = emailField.validate(data.get("email"));
    const codeOk = useBackup || (code ? codeField.validate(code) : true); // 2FA optional per account
    if (!emailOk || !codeOk) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
          code: useBackup ? undefined : data.get("code"),
          backupCode: useBackup ? backupCode : undefined,
        }),
      });
      if (res.ok) {
        router.push("/admin/dashboard");
        router.refresh();
        return;
      }
      // Password correct but no 2FA yet → go enroll (invite / first login).
      const payload = await res.json().catch(() => null);
      if (payload?.error?.code === "SETUP_2FA") {
        router.push("/admin/setup-2fa");
        return;
      }
      setErr(res.status === 429 ? "Too many attempts. Try again in a few minutes." : "Incorrect email, password, or code.");
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field label="Email" error={emailField.error}>
        <Input
          name="email"
          type="email"
          maxLength={160}
          autoComplete="username"
          required
          autoFocus
          aria-invalid={!!emailField.error}
          onChange={() => emailField.clear()}
          onBlur={(e) => e.currentTarget.value && emailField.validate(e.currentTarget.value)}
        />
      </Field>
      <Field label="Password">
        <PasswordInput name="password" autoComplete="current-password" required />
      </Field>
      {useBackup ? (
        <Field label="Backup code" hint="One of the recovery codes you saved when enabling 2FA.">
          <Input
            name="backupCode"
            autoComplete="one-time-code"
            placeholder="abcd-1234"
            maxLength={9}
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value)}
          />
        </Field>
      ) : (
        <Field label="Authenticator code" hint="The 6-digit code from your authenticator app." error={codeField.error}>
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            value={code}
            aria-invalid={!!codeField.error}
            onChange={(e) => { setCode(digitsCapped(6)(e.target.value)); codeField.clear(); }}
            onBlur={() => code && codeField.validate(code)}
          />
        </Field>
      )}
      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 justify-self-start"
        onClick={() => { setUseBackup((v) => !v); setErr(null); }}
      >
        {useBackup ? "Use authenticator code instead" : "Lost your device? Use a backup code"}
      </button>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" className="h-11" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
