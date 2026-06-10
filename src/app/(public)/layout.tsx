import Link from "next/link";
import { PublicHeader } from "@/components/nav/PublicHeader";
import { CustomerTabBar } from "@/components/nav/CustomerTabBar";
import { MotionProviders } from "@/components/motion/MotionProviders";
import { getSession } from "@/server/auth/guard";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="rpa flex min-h-dvh flex-col">
      <MotionProviders />
      <PublicHeader signedIn={!!session} />

      {/* pb gives room for the mobile tab bar */}
      <div id="main" className="flex-1 pb-16 sm:pb-0">{children}</div>

      <footer className="gama-1 bg-1 paint relative flex min-h-[100svh] flex-col justify-between overflow-hidden">
        {/* top: brand blurb + nav columns */}
        <div className="wrapper flex flex-col gap-[var(--space-2xl)] pt-[var(--space-4xl)] sm:flex-row sm:justify-between">
          <div className="max-w-[40ch]">
            <p className="f-exat" style={{ fontSize: "var(--h42)", lineHeight: 1.1 }}>BDQ Social</p>
            <p className="f-paragraph-small mt-[var(--space-md)] opacity-80">
              Vadodara&apos;s premium curated festival &amp; night market. Good people, great finds,
              unforgettable evenings.
            </p>
          </div>
          <div className="flex flex-wrap gap-[var(--space-3xl)]">
            {[
              ["Explore", [["Events & tickets", "/events"], ["Meet the brands", "/vendors"], ["Event layout", "/map"]]],
              ["Partners", [["Sell with us", "/vendor/login"], ["Sign in", "/login"], ["About us", "/about"], ["Contact", "/contact"]]],
              ["Legal", [["Privacy", "/privacy"], ["Terms", "/terms"], ["Refunds", "/refunds"], ["Shipping", "/shipping"], ["Vendor terms", "/vendor-terms"]]],
            ].map(([heading, items]) => (
              <nav key={heading as string} className="f-paragraph-small f-bold flex flex-col gap-[var(--space-sm)]">
                <span className="t-upper opacity-50" style={{ letterSpacing: "0.16em" }}>{heading as string}</span>
                {(items as [string, string][]).map(([label, href]) => (
                  <Link key={href} href={href} data-cursor className="opacity-80 transition-opacity hover:opacity-100">
                    {label}
                  </Link>
                ))}
              </nav>
            ))}
          </div>
        </div>

        {/* giant Let's talk */}
        <div className="wrapper py-[var(--space-2xl)]">
          <Link href="/contact" data-cursor className="f-exat block w-fit" style={{ fontSize: "var(--h235)", lineHeight: 0.9 }}>
            Let&apos;s talk
          </Link>
        </div>

        {/* bottom: legal + lang */}
        <div className="wrapper flex items-end justify-between pb-[var(--space-lg)]">
          <span className="f-paragraph-small opacity-60">
            All sales are final · © {new Date().getFullYear()} BDQ Social
          </span>
          <span className="f-paragraph-small f-bold t-upper" style={{ letterSpacing: "0.14em" }}>EN</span>
        </div>
      </footer>

      <CustomerTabBar />
    </div>
  );
}
