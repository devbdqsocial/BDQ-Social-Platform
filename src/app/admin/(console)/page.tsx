import Link from "next/link";
import { Activity, BarChart3, BellRing, CalendarDays, Gift, Handshake, LayoutGrid, QrCode, ScrollText, Store, Tag, Users } from "lucide-react";
import { requireAdmin } from "@/server/auth/guard";
import { canAccessSection, type ConsoleSection } from "@/lib/console-access";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const TILES: { href: string; section: ConsoleSection; icon: typeof CalendarDays; title: string; desc: string }[] = [
  { href: "/admin/events", section: "events", icon: CalendarDays, title: "Events", desc: "Create events, set ticket prices, and publish them to the public site." },
  { href: "/admin/map", section: "map", icon: LayoutGrid, title: "Floor plan", desc: "Lay out stalls, stages, and zones — the live market map." },
  { href: "/admin/vendors", section: "vendors", icon: Store, title: "Vendors", desc: "Review brand applications and confirm their stalls." },
  { href: "/admin/sponsors", section: "sponsors", icon: Handshake, title: "Sponsors", desc: "Add partners and their logos to the event." },
  { href: "/admin/checkin", section: "checkin", icon: QrCode, title: "Check-in", desc: "Scan tickets at the gate on event day." },
  { href: "/admin/comps", section: "comps", icon: Gift, title: "Comp tickets", desc: "Issue free VIP / sponsor / press tickets." },
  { href: "/admin/waitlist", section: "waitlist", icon: BellRing, title: "Waitlist", desc: "See who wants tickets and notify them." },
  { href: "/admin/analytics", section: "analytics", icon: BarChart3, title: "Analytics", desc: "Sales, revenue, attendance, and occupancy." },
  { href: "/admin/coupons", section: "coupons", icon: Tag, title: "Coupons", desc: "Create and manage promo codes." },
  { href: "/admin/staff", section: "staff", icon: Users, title: "Staff", desc: "Add teammates and choose what each can do." },
  { href: "/admin/audit", section: "audit", icon: ScrollText, title: "Audit log", desc: "Review every admin and staff action." },
  { href: "/admin/ops", section: "ops", icon: Activity, title: "System", desc: "Live health: notifications, orders, holds." },
];

export default async function AdminHome() {
  const session = await requireAdmin();
  const tiles = TILES.filter((t) => canAccessSection(session, t.section));

  return (
    <div>
      <PageHeader title="Welcome back" description="Everything you need to run the market, in one place." />
      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="card-hover h-full">
              <CardHeader>
                <span className="grid size-10 place-items-center rounded-lg bg-primary/15 text-primary">
                  <t.icon className="size-5" />
                </span>
                <CardTitle className="mt-3">{t.title}</CardTitle>
                <CardDescription>{t.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
