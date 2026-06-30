import type { Metadata } from "next";
import { PhoneLogin } from "@/components/auth/PhoneLogin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vendor sign in" };

export default function VendorLoginPage() {
  return (
    <div className="bdq">
      <section className="grid min-h-[100svh] lg:grid-cols-2">
        {/* left — big Exat headline on navy/yellow */}
        <div className="bdq-sun paint hidden items-end p-[var(--space-4xl)] lg:flex">
          <h1 className="f-exat f-h235">Sell with us</h1>
        </div>

        {/* right — phone-OTP form on cream */}
        <div className="flex items-center justify-center p-[var(--space-2xl)]" style={{ background: "var(--color-cream-100)", color: "var(--color-ink)" }}>
          <div className="w-full max-w-md">
            <span className="f-paragraph-small f-bold t-upper opacity-70" style={{ letterSpacing: "0.18em" }}>Vendor sign in</span>
            <h2 className="f-exat mt-[var(--space-sm)] lg:hidden f-h60">Sell with us</h2>
            <p className="f-paragraph mt-[var(--space-md)] opacity-70">
              Sign in with your phone number to set up your brand and book a stall.
            </p>
            <div className="mt-[var(--space-2xl)]">
              <PhoneLogin redirectTo="/vendor/dashboard" zone="vendor" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
