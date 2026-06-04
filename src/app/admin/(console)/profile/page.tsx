import { getSession } from "@/server/auth/guard";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Shield, Smartphone, Key } from "lucide-react";

export default async function AdminProfilePage() {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, phone: true, role: true, totpEnabled: true }
  });

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="My Profile" 
        description="Manage your account settings and security preferences."
      />
      
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Personal Information</h2>
            </div>
            <div className="space-y-4 border-t border-border pt-4">
              <div className="grid gap-1">
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{user.name || "Not set"}</p>
              </div>
              <div className="grid gap-1">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{user.email}</p>
              </div>
              <div className="grid gap-1">
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <p className="font-mono text-xs px-2 py-1 bg-muted rounded-md w-fit">{user.role}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                Security
              </h2>
            </div>
            <div className="space-y-6 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-full">
                    <Key className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Password</p>
                    <p className="text-xs text-muted-foreground">Last changed recently</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Update</Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-full">
                    <Smartphone className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">
                      {user.totpEnabled ? "Enabled (Authenticator App)" : "Disabled - Not recommended"}
                    </p>
                  </div>
                </div>
                <Button variant={user.totpEnabled ? "outline" : "default"} size="sm">
                  {user.totpEnabled ? "Manage" : "Enable 2FA"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
