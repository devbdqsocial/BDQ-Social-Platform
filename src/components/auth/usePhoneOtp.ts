"use client";

import { useRef, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";

/**
 * Phone-OTP flow (Firebase) shared by the login page and the inline checkout sheet (R3.3).
 * One source of truth for the reCAPTCHA + send/verify dance so the checkout never has to bounce
 * the buyer to /login (and lose their cart). Callers render an element with `id={recaptchaId}`.
 */

const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

export function usePhoneOtp(recaptchaId = "recaptcha") {
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => { setConfirmation(null); setCode(""); setStatus(null); };

  const sendOtp = async () => {
    setLoading(true);
    setStatus(null);
    try {
      if (!verifierRef.current) {
        verifierRef.current = new RecaptchaVerifier(firebaseAuth, recaptchaId, { size: "invisible" });
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

  /**
   * Confirm the code and establish the app session. On success runs `onVerified` (e.g. resume
   * checkout). Returns true on success. `verifyBody` carries zone/vendorSignup to /api/auth/verify.
   */
  const verifyOtp = async (
    onVerified: () => void | Promise<void>,
    verifyBody: Record<string, unknown> = {},
  ): Promise<boolean> => {
    if (!confirmation) return false;
    setLoading(true);
    setStatus(null);
    try {
      const cred = await confirmation.confirm(code.trim());
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken, ...verifyBody }),
      });
      if (!res.ok) throw new Error("Sign-in failed");
      await onVerified();
      return true;
    } catch (e) {
      setStatus(msg(e));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { phone, setPhone, code, setCode, confirmation, status, loading, sendOtp, verifyOtp, reset, recaptchaId };
}
