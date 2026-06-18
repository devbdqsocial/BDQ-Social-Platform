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
  const emailField = useFieldValidation(emailSchema);
  const codeField = useFieldValidation(totp6);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const emailOk = emailField.validate(data.get("email"));
    const codeOk = code ? codeField.validate(code) : true; // 2FA optional per account
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
          code: data.get("code"),
        }),
      });
      if (res.ok) {
        router.push("/admin/dashboard");
        router.refresh();
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
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" className="h-11" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
