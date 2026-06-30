import type { Metadata } from "next";
import { PhoneLogin } from "@/components/auth/PhoneLogin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

// Only same-site relative paths are honoured as the post-login target (no open redirect).
const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");

export default async function CustomerLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const redirectTo = safeNext(next);
  return (
    <section className="grid min-h-[100svh] lg:grid-cols-2">
      {/* left — big Exat headline on navy */}
      <div className="bdq-night paint hidden items-end p-[var(--space-4xl)] lg:flex">
        <h1 className="f-exat f-h235">Welcome in</h1>
      </div>

      {/* right — the phone-OTP form on cream */}
      <div className="paint flex items-center justify-center p-[var(--space-2xl)]">
        <div className="w-full max-w-md">
          <span className="kicker opacity-70">Sign in</span>
          <h2 className="f-exat mt-[var(--space-sm)] lg:hidden f-h60">Welcome in</h2>
          <p className="f-paragraph mt-[var(--space-md)] opacity-70">
            Sign in with your phone number to book tickets and find them again later.
          </p>
          <div className="mt-[var(--space-2xl)]">
            <PhoneLogin redirectTo={redirectTo} />
          </div>
          <p className="f-paragraph-small mt-[var(--space-lg)] opacity-70">
            We&apos;ll text you a one-time code. No passwords to remember.
          </p>
        </div>
      </div>
    </section>
  );
}
