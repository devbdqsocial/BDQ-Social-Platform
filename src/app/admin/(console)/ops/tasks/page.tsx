import { requireAdmin } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TaskCenterPage() {
  await requireAdmin();
  const { active } = await getActiveEvent();

  return (
    <div className="space-y-6 flex flex-col h-full">
      <PageHeader 
        title="Task Center" 
        description={active ? `Manage operational tasks for ${active.name}.` : "Manage global operational tasks."}
      />
      
      <div className="flex-1 grid gap-4 grid-cols-1 md:grid-cols-4 min-h-[600px]">
        {/* TO DO COLUMN */}
        <Card className="bg-muted/30 border-dashed">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              To Do
              <Badge variant="neutral">2</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3">
            <TaskCard title="Review Vendor: Foodies Co" desc="Pending FSSAI verification" tag="Vendor" />
            <TaskCard title="Approve Map Layout" desc="Stage 2 layout needs sign-off" tag="Venue" />
          </CardContent>
        </Card>

        {/* IN PROGRESS COLUMN */}
        <Card className="bg-muted/30 border-dashed">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              In Progress
              <Badge variant="primary">1</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3">
            <TaskCard title="Send Sponsor Contracts" desc="Awaiting signatures from 2 sponsors" tag="Growth" />
          </CardContent>
        </Card>

        {/* BLOCKED COLUMN */}
        <Card className="bg-muted/30 border-dashed">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Blocked
              <Badge variant="danger">1</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3">
            <TaskCard title="Payment Gateway KYC" desc="Awaiting response from Razorpay" tag="Finance" />
          </CardContent>
        </Card>

        {/* DONE COLUMN */}
        <Card className="bg-muted/30 border-dashed">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Done
              <Badge variant="success">1</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 opacity-70">
            <TaskCard title="Setup Ticket Tiers" desc="Early bird and VIP created" tag="Tickets" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TaskCard({ title, desc, tag }: { title: string; desc: string; tag: string }) {
  return (
    <div className="bg-background border rounded-md p-3 shadow-sm cursor-pointer hover:border-primary transition-colors">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-medium leading-tight">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{desc}</p>
      <Badge variant="neutral" className="text-[10px] px-1.5 py-0">{tag}</Badge>
    </div>
  );
}
