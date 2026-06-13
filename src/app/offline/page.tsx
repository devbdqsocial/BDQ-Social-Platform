import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="rpa">
      <section className="gama-1 bg-1 paint flex min-h-[100svh] flex-col items-center justify-center px-[var(--wrapper-padd)] text-center">
        <h1 className="f-exat f-h100">You&apos;re offline</h1>
        <p className="f-paragraph mt-[var(--space-md)] max-w-[40ch] opacity-80">
          No connection right now. Your tickets are saved on your phone — reconnect to load the latest.
        </p>
        <Link href="/" className="f-paragraph-small f-bold mt-[var(--space-2xl)] t-upper underline" style={{ letterSpacing: "0.14em" }}>
          Try again
        </Link>
      </section>
    </div>
  );
}
