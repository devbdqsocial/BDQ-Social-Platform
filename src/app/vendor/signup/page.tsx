import type { Metadata } from "next";
import Link from "next/link";
import { PhoneLogin } from "@/components/auth/PhoneLogin";

export const metadata: Metadata = { title: "Become a vendor" };
export const dynamic = "force-dynamic";

const STEPS = ["Brand details", "Verification documents", "Pick your stall", "Sign the agreement", "Pay & you're in"];

export default function VendorSignupPage() {
  return (
    <div className="bdq bdq-app">
      <section className="grid min-h-[100svh] lg:grid-cols-2">
        {/* left — BDQ pitch */}
        <div className="bdq-rose paint hidden flex-col justify-between p-[var(--space-4xl)] lg:flex">
          <span className="f-paragraph-small f-bold t-upper" style={{ letterSpacing: "0.2em" }}>Sell with us</span>
          <h1 className="f-exat f-h133">
            Bring your brand to the night market
          </h1>
          <ol className="f-paragraph-small flex flex-col gap-[var(--space-sm)] opacity-80">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-[var(--space-md)]">
                <span className="f-exat f-h32">0{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>

        {/* right — phone OTP signup */}
        <div className="flex items-center justify-center p-[var(--space-2xl)]" style={{ background: "var(--bgcolor)", color: "var(--color)" }}>
          <div className="w-full max-w-md">
            <span className="f-paragraph-small f-bold t-upper opacity-70" style={{ letterSpacing: "0.18em" }}>New vendor</span>
            <h2 className="f-exat mt-[var(--space-sm)] f-h60">Become a vendor</h2>
            <p className="f-paragraph mt-[var(--space-md)] opacity-70">
              Start with your phone number — we&apos;ll text you a one-time code, then walk you through the rest.
            </p>
            <div className="mt-[var(--space-2xl)]">
              <PhoneLogin vendorSignup zone="vendor" redirectTo="/vendor/onboarding" />
            </div>
            <p className="f-paragraph-small mt-[var(--space-lg)] opacity-75">
              Already registered?{" "}
              <Link href="/vendor/login?zone=vendor" className="underline">Sign in</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
