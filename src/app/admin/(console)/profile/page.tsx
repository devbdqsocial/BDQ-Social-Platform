import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth/guard";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Settings as SettingsIcon, LogOut } from "lucide-react";
import { ProfileForm } from "./ProfileForm";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Admin Profile" };

/**
 * Renders the administrator's profile setup and preferences page.
 * Displays personal editable details (name, phone, credentials) in the main column
 * and security statistics, global admin settings shortcuts, and session logout triggers in the sidebar.
 */
export default async function AdminProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { name: true, designation: true, email: true, phone: true, whatsapp: true, role: true, totpEnabled: true, prefs: true }
  });

  if (!user) {
    return null;
  }

  // Sign-in history is already captured as audit rows on every admin login.
  const logins = await db.auditLog.findMany({
    where: { actorId: session.userId, action: "admin.login" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { createdAt: true, ip: true, userAgent: true },
  });
  const loginHistory = logins.map((l) => ({ at: l.createdAt.toISOString(), ip: l.ip, ua: l.userAgent }));
  const prefs = (user.prefs ?? {}) as { locale?: string | null; timezone?: string | null; dateFormat?: string | null; currency?: string | null };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="My Profile" 
        description="Manage your admin account details, system preferences, and security."
      />
      
      <div className="grid gap-8 md:grid-cols-3">
        {/* Left Column: Form containing editable details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>Update your display name, contact number, or sign-in credentials.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                initialData={{
                  name: user.name,
                  designation: user.designation,
                  email: user.email,
                  phone: user.phone,
                  whatsapp: user.whatsapp,
                  prefs,
                }}
                totpEnabled={user.totpEnabled}
                role={user.role}
                loginHistory={loginHistory}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Cards for other settings and logout */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Shield className="size-4 text-primary" />
                System Role
              </CardTitle>
              <CardDescription>Your access level.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xs px-2 py-0.5 bg-muted rounded-md w-fit">{user.role}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <SettingsIcon className="size-4 text-primary" />
                System Management
              </CardTitle>
              <CardDescription>Manage platform-wide configurations.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                Organization, roles, staff, audit logs, and system health.
              </p>
              <Button asChild variant="outline" className="w-full text-xs h-9">
                <Link href="/admin/settings">Go to Settings</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5 dark:bg-destructive/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <LogOut className="size-4" />
                Session Control
              </CardTitle>
              <CardDescription>Sign out of your account on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <LogoutButton redirectTo="/login" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
