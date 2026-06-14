"use client";

import { useRouter } from "next/navigation";
import { usePhoneOtp } from "./usePhoneOtp";
import { Button } from "@/components/ui/button";

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

  const verifyCode = () =>
    verifyOtp(() => { router.push(redirectTo); router.refresh(); }, { zone, vendorSignup });

  return (
    <div className="space-y-4">
      {!confirmation ? (
        <>
          <label className="block text-sm font-medium">
            Phone number
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <Button className="w-full" disabled={loading} onClick={sendOtp}>
            {loading ? "Sending…" : "Send OTP"}
          </Button>
        </>
      ) : (
        <>
          <label className="block text-sm font-medium">
            Enter the 6-digit code
            <input
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-center text-lg tracking-[0.4em]"
            />
          </label>
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
