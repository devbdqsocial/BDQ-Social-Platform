import { redirect } from "next/navigation";
import { ZoneSidebar } from "@/components/nav/ZoneSidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getSession, type Permission, type Role } from "@/server/auth/guard";
import { canAccessSection, type ConsoleSection } from "@/lib/console-access";
import { env } from "@/lib/env";

const NAV: { href: string; label: string; section: ConsoleSection }[] = [
  { href: "/admin", label: "Overview", section: "overview" },
  { href: "/admin/events", label: "Events", section: "events" },
  { href: "/admin/map", label: "Floor plan", section: "map" },
  { href: "/admin/vendors", label: "Vendors", section: "vendors" },
  { href: "/admin/sponsors", label: "Sponsors", section: "sponsors" },
  { href: "/admin/checkin", label: "Check-in", section: "checkin" },
  { href: "/admin/comps", label: "Comp tickets", section: "comps" },
  { href: "/admin/waitlist", label: "Waitlist", section: "waitlist" },
  { href: "/admin/analytics", label: "Analytics", section: "analytics" },
  { href: "/admin/coupons", label: "Coupons", section: "coupons" },
  { href: "/admin/staff", label: "Staff", section: "staff" },
  { href: "/admin/audit", label: "Audit log", section: "audit" },
  { href: "/admin/ops", label: "System", section: "ops" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const devBypass = env.DEV_ADMIN && process.env.NODE_ENV !== "production";

  const effective: { role: Role; permissions: Permission[] } | null =
    session && (session.role === "SUPER_ADMIN" || session.role === "STAFF")
      ? { role: session.role, permissions: session.permissions }
      : devBypass
        ? { role: "SUPER_ADMIN", permissions: [] }
        : null;
  if (!effective) redirect("/admin/login");

  const items = NAV.filter((n) => canAccessSection(effective, n.section)).map(({ href, label }) => ({ href, label }));

  return (
    <div className="dark flex min-h-dvh flex-col bg-background text-foreground sm:flex-row">
      <ZoneSidebar variant="admin" brand="Admin" items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden h-14 items-center justify-between border-b border-border px-6 sm:flex">
          <span className="text-sm text-muted-foreground">Admin workspace</span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        <main id="main" className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
