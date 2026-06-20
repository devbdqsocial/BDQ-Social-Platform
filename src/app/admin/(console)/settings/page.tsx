import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { canAccessSection, type ConsoleSection } from "@/lib/console-access";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Building2, Shield, Users, FileClock, Bell, Activity, ShieldAlert, Plug, MessageSquare, DatabaseBackup, ToggleRight, Search, BarChart3, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const metadata: Metadata = { title: "Settings" };

type Tile = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** Visibility: a console section gate, "self" (everyone), "admin" (SUPER_ADMIN/ADMIN), or "super" (SUPER_ADMIN only). */
  gate: ConsoleSection | "self" | "admin" | "super";
};

// Consolidates existing console surfaces into one hub; new sections (Organization) are added here as built.
const TILES: Tile[] = [
  { title: "My Profile", description: "Your details, password, 2FA, and preferences.", href: "/admin/profile", icon: User, gate: "self" },
  { title: "Organization", description: "BDQ master account — legal name, contacts, identifiers.", href: "/admin/settings/organization", icon: Building2, gate: "super" },
  { title: "Security Center", description: "2FA coverage, sign-ins, force log-out.", href: "/admin/settings/security", icon: ShieldAlert, gate: "super" },
  { title: "Integrations", description: "Razorpay, Cloudinary, email, WhatsApp status.", href: "/admin/settings/integrations", icon: Plug, gate: "admin" },
  { title: "Communication", description: "Email/WhatsApp delivery and queue health.", href: "/admin/settings/communication", icon: MessageSquare, gate: "admin" },
  { title: "Roles & Permissions", description: "What each teammate can access.", href: "/admin/system/roles", icon: Shield, gate: "staff" },
  { title: "Staff", description: "Invite teammates and manage accounts.", href: "/admin/ops/staff", icon: Users, gate: "staff" },
  { title: "Audit Logs", description: "Every admin action, append-only.", href: "/admin/system/audit", icon: FileClock, gate: "audit" },
  { title: "Notifications", description: "Platform alerts and history.", href: "/admin/system/notifications", icon: Bell, gate: "self" },
  { title: "System Health", description: "Queues, cron, webhooks, and DB status.", href: "/admin/ops", icon: Activity, gate: "ops" },
  { title: "Backup & Recovery", description: "Export orders, expenses, and audit data.", href: "/admin/settings/backup", icon: DatabaseBackup, gate: "admin" },
  { title: "Feature Flags", description: "Turn customer modules on or off.", href: "/admin/settings/flags", icon: ToggleRight, gate: "super" },
  { title: "SEO", description: "Site title, description, and share image.", href: "/admin/settings/seo", icon: Search, gate: "super" },
  { title: "Analytics", description: "GA4, Meta Pixel, and Clarity IDs.", href: "/admin/settings/analytics", icon: BarChart3, gate: "super" },
  { title: "Danger Zone", description: "Archive or delete events; disable sales.", href: "/admin/settings/danger", icon: TriangleAlert, gate: "super" },
];

export default async function SettingsHubPage() {
  const session = await requireAdmin();
  const show = (gate: Tile["gate"]) =>
    gate === "self"
      ? true
      : gate === "super"
        ? session.role === "SUPER_ADMIN"
        : gate === "admin"
          ? session.role === "SUPER_ADMIN" || session.role === "ADMIN"
          : canAccessSection(session, gate);
  const tiles = TILES.filter((t) => show(t.gate));

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account and the platform." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <t.icon className="size-4 text-primary" /> {t.title}
                </CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
