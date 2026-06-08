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
    select: { name: true, email: true, phone: true, role: true, totpEnabled: true }
  });

  if (!user) {
    return null;
  }

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
              <ProfileForm initialData={{ name: user.name, email: user.email, phone: user.phone }} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Cards for other settings, 2FA, and logout */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Shield className="size-4 text-primary" />
                Security & Verification
              </CardTitle>
              <CardDescription>Platform access control status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1 text-sm">
                <p className="font-medium">System Role</p>
                <p className="font-mono text-xs px-2 py-0.5 bg-muted rounded-md w-fit mt-1">{user.role}</p>
              </div>
              <div className="grid gap-1 text-sm">
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {user.totpEnabled ? "Enabled (Authenticator App)" : "Disabled (Not recommended)"}
                </p>
              </div>
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
                Access convenience fees, database backup tools, and platform settings.
              </p>
              <Button asChild variant="outline" className="w-full text-xs h-9">
                <Link href="/settings">Go to Global Settings</Link>
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
