import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminRole } from "@/server/auth/guard";
import { listCampaigns, getCampaignSettings } from "@/server/campaigns/service";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { createCampaignAction, updateSettingAction } from "./actions";
import { CampaignsTable } from "./CampaignsTable";

export const metadata: Metadata = { title: "Campaigns" };

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function CampaignsPage({ searchParams }: PageProps) {
  await requireAdminRole();
  const campaigns = await listCampaigns();
  const settings = await getCampaignSettings();
  
  const params = await searchParams;
  const activeTab = params.tab || "overview";

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Campaigns" 
        description="Directly manage WhatsApp and Email campaigns from the portal. Set up credentials to begin broadcasting." 
      />

      {/* Modern Tabs Navigation */}
      <div className="flex border-b border-muted">
        <Link 
          href="/admin/growth/campaigns?tab=overview" 
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-all duration-200 ${
            activeTab === "overview" 
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Campaigns Overview
        </Link>
        <Link 
          href="/admin/growth/campaigns?tab=settings" 
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-all duration-200 ${
            activeTab === "settings" 
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          API Settings Configuration
        </Link>
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-8">
          {/* New Campaign Creation Panel */}
          <div className="rounded-xl border bg-card/60 backdrop-blur-md p-6 shadow-sm">
            <form action={createCampaignAction} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">New Broadcast Campaign</h2>
                <p className="text-sm text-muted-foreground">Instantly opens the workspace where you can target, preview, and send.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Campaign Name" className="sm:col-span-2">
                  <Input name="name" required placeholder="e.g., Early Bird Blast / Waitlist Announcement" />
                </Field>
                <Field label="Notification Channel" className="sm:col-span-2">
                  <Select name="channel" defaultValue="EMAIL">
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </Select>
                </Field>
                <Button type="submit" className="w-fit bg-emerald-600 hover:bg-emerald-700 text-white font-medium sm:col-span-2">
                  Launch Builder Workspace
                </Button>
              </div>
            </form>
          </div>

          {/* Active campaigns list */}
          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Campaign History ({campaigns.length})</h2>
            <CampaignsTable campaigns={campaigns} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Provider Settings</h2>
            <p className="text-sm text-muted-foreground">Provider secrets are read from environment variables.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* SendGrid Configuration Block */}
            <div className="rounded-xl border bg-card/60 backdrop-blur-md p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-base">SendGrid Email API</h3>
                  <p className="text-xs text-muted-foreground">Used for sending raw HTML layout broadcast emails.</p>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wide border ${
                  settings.SENDGRID_API_KEY ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                }`}>
                  {settings.SENDGRID_API_KEY ? "Active" : "Not Configured"}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-muted text-xs text-muted-foreground">
                <p>API key: {settings.SENDGRID_API_KEY ? "configured" : "missing"}</p>
              </div>

              <form action={updateSettingAction} className="space-y-4 pt-4 border-t border-muted">
                <input type="hidden" name="key" value="EMAIL_FROM" />
                <Field label="Sender Email address (EMAIL_FROM)" hint="Needs to be a verified sender on SendGrid">
                  <Input 
                    name="value" 
                    defaultValue={settings.EMAIL_FROM} 
                    required 
                  />
                </Field>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Save Sender
                </Button>
              </form>
            </div>

            {/* WhatsApp Configuration Block */}
            <div className="rounded-xl border bg-card/60 backdrop-blur-md p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-base">WhatsApp</h3>
                  <p className="text-xs text-muted-foreground">Used for configured WhatsApp broadcast delivery.</p>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wide border ${
                  settings.WHATSAPP_CONFIGURED ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                }`}>
                  {settings.WHATSAPP_CONFIGURED ? "Active" : "Not Configured"}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-muted text-xs text-muted-foreground">
                <p>Provider: {settings.WHATSAPP_PROVIDER || "auto-detect"}</p>
                <p>Access token: {settings.WHATSAPP_CLOUD_TOKEN ? "configured" : "missing"}</p>
                <p>Phone Number ID: {settings.WHATSAPP_CLOUD_PHONE_ID ? "configured" : "missing"}</p>
                <p>OpenWA URL: {settings.OPENWA_BASE_URL ? "configured" : "missing"}</p>
                <p>OpenWA key: {settings.OPENWA_API_KEY ? "configured" : "missing"}</p>
                <p>OpenWA session: {settings.OPENWA_SESSION_ID ? "configured" : "missing"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

