import { requireAdmin } from "@/server/auth/guard";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default async function SystemSettingsPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Global Settings" 
        description="Manage platform-wide configurations, fees, and maintenance mode."
      />
      
      <div className="grid gap-8">
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Maintenance Mode</h2>
            <p className="text-sm text-muted-foreground">Disable access to public and vendor portals. Admins can still log in.</p>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium">Current Status</p>
              <p className="text-sm text-muted-foreground">Platform is LIVE</p>
            </div>
            <Button variant="outline">Enable Maintenance</Button>
          </div>
        </div>

        <div className="space-y-4 border-t border-border pt-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Convenience Fees</h2>
            <p className="text-sm text-muted-foreground">Default platform convenience fee charged on online ticket sales.</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-sm font-medium">Flat Fee</p>
                <p className="text-sm text-muted-foreground">₹0.00</p>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Percentage Fee</p>
                <p className="text-sm text-muted-foreground">2.5%</p>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
