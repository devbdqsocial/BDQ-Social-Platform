"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";

const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

export function PhoneLogin({ redirectTo = "/events", zone }: { redirectTo?: string; zone?: "vendor" | "customer" }) {
  const router = useRouter();
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    setLoading(true);
    setStatus(null);
    try {
      if (!verifierRef.current) {
        verifierRef.current = new RecaptchaVerifier(firebaseAuth, "recaptcha", { size: "invisible" });
      }
      const conf = await signInWithPhoneNumber(firebaseAuth, phone.trim(), verifierRef.current);
      setConfirmation(conf);
      setStatus("Code sent — check your SMS.");
    } catch (e) {
      setStatus(msg(e));
      verifierRef.current?.clear();
      verifierRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!confirmation) return;
    setLoading(true);
    setStatus(null);
    try {
      const cred = await confirmation.confirm(code.trim());
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken, zone }),
      });
      if (!res.ok) throw new Error("Sign-in failed");
      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setStatus(msg(e));
    } finally {
      setLoading(false);
    }
  };

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
