import Link from "next/link";
import { PublicHeader } from "@/components/nav/PublicHeader";
import { CustomerTabBar } from "@/components/nav/CustomerTabBar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      {/* pb gives room for the mobile tab bar */}
      <div id="main" className="flex-1 pb-16 sm:pb-0">{children}</div>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <p className="font-display text-lg font-semibold">
              BDQ <span className="text-primary">Social</span>
            </p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Vadodara&apos;s premium curated festival &amp; night market. Good people, great finds,
              unforgettable evenings.
            </p>
          </div>
          <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Explore</p>
            <Link href="/events" className="hover:text-foreground">Events &amp; tickets</Link>
            <Link href="/vendors" className="hover:text-foreground">Meet the brands</Link>
            <Link href="/map" className="hover:text-foreground">Floor plan</Link>
          </nav>
          <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">For partners</p>
            <Link href="/vendor/login" className="hover:text-foreground">Sell with us</Link>
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
          </nav>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto max-w-[1200px] px-4 py-4 text-xs text-muted-foreground sm:px-6">
            All sales are final · © {new Date().getFullYear()} BDQ Social
          </div>
        </div>
      </footer>

      <CustomerTabBar />
    </div>
  );
}
