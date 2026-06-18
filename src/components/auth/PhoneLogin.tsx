"use client";

import { useRouter } from "next/navigation";
import { usePhoneOtp } from "./usePhoneOtp";
import { Button } from "@/components/ui/button";
import { phone10, otp6, digitsCapped } from "@/lib/validators";
import { useFieldValidation } from "@/lib/use-field-validation";

export function PhoneLogin({
  redirectTo = "/events",
  zone,
  vendorSignup = false,
}: {
  redirectTo?: string;
  zone?: "vendor" | "customer";
  /** Deliberate self-serve vendor signup — grants the VENDOR applicant role (see /api/auth/verify). */
  vendorSignup?: boolean;
}) {
  const router = useRouter();
  const { phone, setPhone, code, setCode, confirmation, status, loading, sendOtp, verifyOtp } = usePhoneOtp();
  const phoneField = useFieldValidation(phone10);
  const otpField = useFieldValidation(otp6);

  // The hook holds the E.164 number (+91… for Firebase); the field edits just the 10 local digits.
  const local = phone.replace(/^\+91/, "");

  const send = () => {
    if (!phoneField.validate(local)) return;
    sendOtp();
  };
  const verifyCode = () => {
    if (!otpField.validate(code)) return;
    verifyOtp(() => { router.push(redirectTo); router.refresh(); }, { zone, vendorSignup });
  };

  return (
    <div className="space-y-4">
      {!confirmation ? (
        <>
          <label className="block text-sm font-medium">
            Phone number
            <div className="mt-1 flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3 aria-invalid:border-destructive" aria-invalid={!!phoneField.error}>
              <span className="text-sm text-muted-foreground">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                value={local}
                onChange={(e) => {
                  setPhone("+91" + digitsCapped(10)(e.target.value));
                  phoneField.clear();
                }}
                onBlur={() => local && phoneField.validate(local)}
                aria-invalid={!!phoneField.error}
                placeholder="9876543210"
                className="h-full w-full bg-transparent text-sm outline-none"
              />
            </div>
          </label>
          {phoneField.error && <p className="text-sm text-destructive">{phoneField.error}</p>}
          <Button className="w-full" disabled={loading} onClick={send}>
            {loading ? "Sending…" : "Send OTP"}
          </Button>
        </>
      ) : (
        <>
          <label className="block text-sm font-medium">
            Enter the 6-digit code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(digitsCapped(6)(e.target.value));
                otpField.clear();
              }}
              onBlur={() => code && otpField.validate(code)}
              aria-invalid={!!otpField.error}
              placeholder="123456"
              className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-center text-lg tracking-[0.4em] aria-invalid:border-destructive"
            />
          </label>
          {otpField.error && <p className="text-sm text-destructive">{otpField.error}</p>}
          <Button className="w-full" disabled={loading} onClick={verifyCode}>
            {loading ? "Verifying…" : "Verify & continue"}
          </Button>
        </>
      )}

      {status && <p className="text-sm text-muted-foreground">{status}</p>}
      <div id="recaptcha" />
    </div>
  );
}
