"use client";

import { useRouter } from "next/navigation";
import { usePhoneOtp } from "./usePhoneOtp";
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
            <div className="bdq-input mt-1 flex h-11 items-center gap-2" aria-invalid={!!phoneField.error}>
              <span className="text-sm opacity-60">+91</span>
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
                className="h-full w-full bg-transparent text-sm text-current outline-none placeholder:opacity-45"
              />
            </div>
          </label>
          {phoneField.error && <p role="alert" className="text-sm font-bold" style={{ color: "var(--red)" }}>{phoneField.error}</p>}
          <button type="button" className="bdq-btn w-full" disabled={loading} onClick={send}>
            {loading ? "Sending…" : "Send OTP"}
          </button>
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
              className="bdq-input mt-1 h-11 w-full text-center text-lg text-current tracking-[0.4em]"
            />
          </label>
          {otpField.error && <p role="alert" className="text-sm font-bold" style={{ color: "var(--red)" }}>{otpField.error}</p>}
          <button type="button" className="bdq-btn w-full" disabled={loading} onClick={verifyCode}>
            {loading ? "Verifying…" : "Verify & continue"}
          </button>
        </>
      )}

      {status && <p role="status" aria-live="polite" className="text-sm opacity-70">{status}</p>}
      <div id="recaptcha" />
    </div>
  );
}
