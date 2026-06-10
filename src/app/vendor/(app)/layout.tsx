import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/guard";
import { env } from "@/lib/env";
import { ZoneSidebar } from "@/components/nav/ZoneSidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/SignOutButton";

const NAV = [
  { href: "/vendor/dashboard", label: "Dashboard" },
  { href: "/vendor/onboarding", label: "Onboarding" },
  { href: "/vendor/profile", label: "Brand profile" },
  { href: "/vendor/events", label: "Book a stall" },
  { href: "/vendor/documents", label: "Documents" },
  { href: "/vendor/leads", label: "Leads" },
];

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  // Backstop authz for the whole authenticated portal (login lives outside this route group).
  // Per-page requireVendor() guards remain — a layout must not be the only gate.
  const session = await getSession();
  const devBypass = env.DEV_VENDOR && process.env.NODE_ENV !== "production";
  const ok = session && (session.role === "VENDOR" || session.role === "SUPER_ADMIN");
  if (!ok && !devBypass) redirect("/vendor/login");

  return (
    <div className="flex min-h-dvh flex-col sm:flex-row">
      <ZoneSidebar
        variant="vendor"
        brand="Vendor"
        items={NAV}
        footer={
          <div className="flex flex-col gap-1">
            <Link
              href="/?zone=public"
              className="rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              View site
            </Link>
            <SignOutButton className="rounded-md px-3 py-2 text-left text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
          </div>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden h-14 items-center justify-between border-b border-border px-6 sm:flex">
          <span className="text-sm text-muted-foreground">Vendor portal</span>
          <div className="flex items-center gap-4">
            <Link href="/?zone=public" className="text-sm text-muted-foreground hover:text-foreground">View site</Link>
            <SignOutButton className="text-sm text-muted-foreground hover:text-foreground" />
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
