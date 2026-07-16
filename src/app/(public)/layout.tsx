import Link from "next/link";
import { PublicHeader } from "@/components/nav/PublicHeader";
import { CustomerTabBar } from "@/components/nav/CustomerTabBar";
import { MotionProviders } from "@/components/motion/MotionProviders";
import { Magnetic } from "@/components/motion/Magnetic";
import { WordmarkWall } from "@/components/motion/WordmarkWall";
import { getSession } from "@/server/auth/guard";
import { getFooterLegalLinks } from "@/server/legal/docs";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationLd, webSiteLd } from "@/lib/seo/jsonld";

const FALLBACK_LEGAL: [string, string][] = [["Privacy", "/privacy"], ["Terms", "/terms"], ["Refunds", "/refunds"], ["Shipping", "/shipping"], ["Vendor terms", "/vendor-terms"]];

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const legalLinks = await getFooterLegalLinks();
  const legalItems: [string, string][] = legalLinks.length ? legalLinks.map((l) => [l.label, l.href]) : FALLBACK_LEGAL;
  return (
    <div className="bdq flex min-h-dvh flex-col">
      <JsonLd data={[organizationLd(), webSiteLd()]} />
      <MotionProviders />
      <PublicHeader signedIn={!!session} />

      {/* pb gives room for the mobile tab bar */}
      <main id="main" className="flex-1 pb-16 sm:pb-0">{children}</main>

      <footer data-header-mode="light" className="bdq-night paint relative flex min-h-[78svh] flex-col justify-between overflow-hidden lg:min-h-[100svh]">
        {/* top: brand blurb, then role-based nav groups (P0.4 IA: Explore / guests / partners / company / legal) */}
        <div className="wrapper pt-[var(--space-4xl)]">
          <div className="max-w-[40ch]">
            <p className="f-exat f-h42">
              BDQ Social<span style={{ color: "var(--green)" }}>.</span>
            </p>
            <p className="f-paragraph-small mt-[var(--space-md)]">
              Vadodara&apos;s premium curated festival &amp; night market. Good people, great finds,
              unforgettable evenings.
            </p>
          </div>
          <div className="mt-[var(--space-3xl)] grid grid-cols-2 gap-x-[var(--space-xl)] gap-y-[var(--space-2xl)] sm:grid-cols-3 lg:grid-cols-5">
            {[
              ["Explore", [["Events & tickets", "/events"], ["Meet the brands", "/vendors"], ["Event layout", "/map"], ["What's on", "/schedule"], ["Offers & deals", "/offers"], ["Festival guide", "/guide"]]],
              ["For guests", [["My tickets", "/tickets"], ["Gallery", "/gallery"], ["Things to do in Vadodara", "/things-to-do-in-vadodara"], ["Night markets in Vadodara", "/night-markets-vadodara"]]],
              ["For partners", [["Sell with us", "/vendor/login"], ["Sign in", "/login"]]],
              ["Company", [["About us", "/about"], ["Contact", "/contact"]]],
              ["Legal", legalItems],
            ].map(([heading, items]) => (
              <nav key={heading as string} className="f-paragraph-small f-bold flex flex-col gap-[var(--space-sm)]">
                <span className="kicker">{heading as string}</span>
                {(items as [string, string][]).map(([label, href]) => (
                  <Link key={href} href={href} data-cursor="link" className="block py-[0.45em] transition-opacity hover:opacity-80">
                    {label}
                  </Link>
                ))}
              </nav>
            ))}
          </div>
        </div>

        {/* signature wall + giant Let's talk */}
        <WordmarkWall rows={2} duration={26} rowClassName="f-h76" className="opacity-20" />
        <div className="wrapper py-[var(--space-2xl)]">
          <Magnetic className="block w-fit">
            <Link href="/contact" data-cursor="cta" className="f-exat block w-fit f-h235">
              Let&apos;s talk
            </Link>
          </Magnetic>
        </div>

        {/* bottom: legal and useful links */}
        <div className="wrapper flex flex-col gap-[var(--space-md)] pb-[calc(var(--space-lg)+env(safe-area-inset-bottom,0px))] sm:flex-row sm:items-end sm:justify-between">
          <span className="f-paragraph-small">
            &copy; {new Date().getFullYear()} BDQ Social - Vadodara, India
          </span>
          <div className="f-paragraph-small f-bold flex flex-wrap gap-[var(--space-lg)] t-upper" style={{ letterSpacing: "0.14em" }}>
            <Link href="/privacy" data-cursor="link" className="link-underline">
              Privacy
            </Link>
            <Link href="/terms" data-cursor="link" className="link-underline">
              Terms
            </Link>
            <Link href="/contact" data-cursor="link" className="link-underline">
              Contact
            </Link>
          </div>
        </div>
      </footer>

      <CustomerTabBar />
    </div>
  );
}
