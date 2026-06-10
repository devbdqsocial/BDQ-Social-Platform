import type { Metadata } from "next";
import { PhoneLogin } from "@/components/auth/PhoneLogin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

export default function CustomerLoginPage() {
  return (
    <section className="grid min-h-[100svh] lg:grid-cols-2">
      {/* left — big Exat headline on navy */}
      <div className="gama-1 bg-1 paint hidden items-end p-[var(--space-4xl)] lg:flex">
        <h1 className="f-exat" style={{ fontSize: "var(--h235)", lineHeight: 0.9 }}>Welcome in</h1>
      </div>

      {/* right — the phone-OTP form on cream */}
      <div className="paint flex items-center justify-center p-[var(--space-2xl)]">
        <div className="w-full max-w-md">
          <span className="kicker opacity-50">Sign in</span>
          <h2 className="f-exat mt-[var(--space-sm)] lg:hidden" style={{ fontSize: "var(--h60)", lineHeight: 1.0 }}>Welcome in</h2>
          <p className="f-paragraph mt-[var(--space-md)] opacity-70">
            Sign in with your phone number to book tickets and find them again later.
          </p>
          <div className="mt-[var(--space-2xl)]">
            <PhoneLogin redirectTo="/dashboard" />
          </div>
          <p className="f-paragraph-small mt-[var(--space-lg)] opacity-50">
            We&apos;ll text you a one-time code. No passwords to remember.
          </p>
        </div>
      </div>
    </section>
  );
}
