import { redirect } from "next/navigation";
import { getSession, type Permission, type Role } from "@/server/auth/guard";
import { canAccessSection } from "@/lib/console-access";
import { getActiveEvent } from "@/server/admin/event-context";
import { listNotifications, unreadCount } from "@/server/notifications/admin";
import { db } from "@/server/db";
import { env } from "@/lib/env";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminThemeClass } from "@/components/admin/admin-theme-class";
import { NAV_DASHBOARD, NAV_GROUPS } from "@/components/admin/nav-config";
import type { ConsoleSection } from "@/lib/console-access";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const devBypass = env.DEV_ADMIN && process.env.NODE_ENV !== "production";

  const effective: { role: Role; permissions: Permission[] } | null =
    session && (session.role === "SUPER_ADMIN" || session.role === "ADMIN" || session.role === "STAFF")
      ? { role: session.role, permissions: session.permissions }
      : devBypass
        ? { role: "SUPER_ADMIN", permissions: [] }
        : null;
  if (!effective) redirect("/admin/login");

  // Pass only serializable section keys to the client chrome (icons live client-side in nav-config).
  const candidates: ConsoleSection[] = [NAV_DASHBOARD.section, ...NAV_GROUPS.flatMap((g) => g.items.map((i) => i.section))];
  const allowed = [...new Set(candidates)].filter((s) => canAccessSection(effective, s));

  const [{ active, events }, notifCount, notifItems, adminUser] = await Promise.all([
    getActiveEvent(),
    unreadCount(),
    listNotifications(10),
    session ? db.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } }) : Promise.resolve(null),
  ]);
  const evLite = events.map((e) => ({ id: e.id, name: e.name, status: e.status }));
  const activeLite = active ? { id: active.id, name: active.name, status: active.status } : null;
  const user = { name: adminUser?.name ?? null, email: adminUser?.email ?? null };

  return (
    <div className="admin">
      <AdminThemeClass />
      <TooltipProvider delayDuration={300}>
        <SidebarProvider>
          <AppSidebar allowed={allowed} user={user} />
          <SidebarInset>
            <AdminHeader active={activeLite} events={evLite} allowed={allowed} notifCount={notifCount} notifItems={notifItems} />
            <main id="main" className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
      <Toaster position="top-right" richColors />
    </div>
  );
}
